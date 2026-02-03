#!/bin/bash
set -e

REGION="ap-southeast-2"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="github-actions-miraiprep"
REPO_NAME=$(basename $(git remote get-url origin 2>/dev/null | sed 's/\.git$//' || echo "YOUR_REPO_NAME"))

echo "=== Setting up GitHub Actions OIDC ==="
echo ""
echo "Account ID: $ACCOUNT_ID"
echo "Region: $REGION"
echo "Role Name: $ROLE_NAME"
echo ""

# Step 1: Create OIDC Provider (if it doesn't exist)
echo "1. Setting up OIDC Provider for GitHub..."
OIDC_EXISTS=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn" \
  --output text 2>/dev/null || echo "")

if [ -z "$OIDC_EXISTS" ]; then
  echo "   Creating OIDC provider..."
  
  # Create thumbprint
  THUMBPRINT=$(echo | openssl s_client -servername token.actions.githubusercontent.com -showcerts -connect token.actions.githubusercontent.com:443 2>/dev/null | \
    openssl x509 -fingerprint -noout | \
    sed 's/://g' | \
    awk -F= '{print tolower($2)}')
  
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list $THUMBPRINT \
    --region $REGION > /dev/null
  
  echo "   ✅ OIDC provider created"
else
  echo "   ✅ OIDC provider already exists: $OIDC_EXISTS"
fi

# Step 2: Create IAM Role
echo ""
echo "2. Creating IAM Role..."
ROLE_EXISTS=$(aws iam get-role \
  --role-name $ROLE_NAME \
  --query 'Role.RoleName' \
  --output text 2>/dev/null || echo "")

if [ -z "$ROLE_EXISTS" ]; then
  echo "   Creating role with trust policy..."
  
  # Create trust policy
  cat > /tmp/trust-policy.json << TRUSTEOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO_NAME}:*"
        }
      }
    }
  ]
}
TRUSTEOF
  
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --region $REGION > /dev/null
  
  echo "   ✅ Role created"
else
  echo "   ✅ Role already exists: $ROLE_NAME"
  
  # Update trust policy if needed
  echo "   Updating trust policy..."
  cat > /tmp/trust-policy.json << TRUSTEOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO_NAME}:*"
        }
      }
    }
  ]
}
TRUSTEOF
  
  aws iam update-assume-role-policy \
    --role-name $ROLE_NAME \
    --policy-document file:///tmp/trust-policy.json \
    --region $REGION > /dev/null
  
  echo "   ✅ Trust policy updated"
fi

# Step 3: Create and attach permissions policy
echo ""
echo "3. Setting up permissions..."

# Create permissions policy
cat > /tmp/permissions-policy.json << PERMSEOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ],
      "Resource": [
        "arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/miraiprep-cluster",
        "arn:aws:ecs:${REGION}:${ACCOUNT_ID}:service/miraiprep-cluster/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::miraiprep",
        "arn:aws:s3:::miraiprep/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    }
  ]
}
PERMSEOF

POLICY_NAME="github-actions-miraiprep-policy"

# Check if policy exists
POLICY_ARN=$(aws iam list-policies \
  --scope Local \
  --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" \
  --output text 2>/dev/null || echo "")

if [ -z "$POLICY_ARN" ]; then
  echo "   Creating permissions policy..."
  POLICY_ARN=$(aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file:///tmp/permissions-policy.json \
    --region $REGION \
    --query 'Policy.Arn' \
    --output text)
  
  echo "   ✅ Policy created: $POLICY_ARN"
else
  echo "   ✅ Policy exists: $POLICY_ARN"
  
  # Update policy version
  echo "   Updating policy..."
  aws iam create-policy-version \
    --policy-arn $POLICY_ARN \
    --policy-document file:///tmp/permissions-policy.json \
    --set-as-default > /dev/null 2>&1 || echo "   (Policy already up to date)"
fi

# Attach policy to role
echo "   Attaching policy to role..."
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn $POLICY_ARN 2>/dev/null || echo "   (Policy already attached)"

echo "   ✅ Permissions configured"

# Step 4: Get Role ARN
ROLE_ARN=$(aws iam get-role \
  --role-name $ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ OIDC Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Role ARN:"
echo "  $ROLE_ARN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Add this Role ARN to your GitHub environment secret:"
echo ""
echo "   Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/environments"
echo "   Click: miraiprep-env"
echo "   Add secret: AWS_ROLE_ARN"
echo "   Value: $ROLE_ARN"
echo ""
echo "2. Also make sure these secrets exist in miraiprep-env:"
echo "   - API_URL (your backend ALB URL)"
echo "   - FRONTEND_URL (your frontend URL)"
echo "   - CLOUDFRONT_DISTRIBUTION_ID (optional)"
echo ""
echo "3. Your workflow is already configured to use OIDC!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
