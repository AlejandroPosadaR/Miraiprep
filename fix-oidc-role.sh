#!/bin/bash
set -e

REGION="ap-southeast-2"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="github-actions-miraiprep"

echo "=== Fixing OIDC Role Trust Policy ==="
echo ""

# Get repository name from git or ask user
REPO_FULL_NAME=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github\.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/' || echo "")

if [ -z "$REPO_FULL_NAME" ]; then
  echo "⚠️  Could not detect repository name from git remote"
  read -p "Enter your GitHub repository (format: username/repo-name): " REPO_FULL_NAME
fi

echo "Repository: $REPO_FULL_NAME"
echo "Account ID: $ACCOUNT_ID"
echo "Role Name: $ROLE_NAME"
echo ""

# Check if role exists
ROLE_EXISTS=$(aws iam get-role \
  --role-name $ROLE_NAME \
  --query 'Role.RoleName' \
  --output text 2>/dev/null || echo "")

if [ -z "$ROLE_EXISTS" ]; then
  echo "❌ Role '$ROLE_NAME' doesn't exist!"
  echo ""
  echo "Creating role..."
  
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
          "token.actions.githubusercontent.com:sub": "repo:${REPO_FULL_NAME}:*"
        }
      }
    }
  ]
}
TRUSTEOF
  
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --region $REGION
  
  echo "✅ Role created"
else
  echo "✅ Role exists: $ROLE_NAME"
  
  # Update trust policy
  echo ""
  echo "Updating trust policy..."
  
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
          "token.actions.githubusercontent.com:sub": "repo:${REPO_FULL_NAME}:*"
        }
      }
    }
  ]
}
TRUSTEOF
  
  aws iam update-assume-role-policy \
    --role-name $ROLE_NAME \
    --policy-document file:///tmp/trust-policy.json
  
  echo "✅ Trust policy updated"
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role \
  --role-name $ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Role Trust Policy Fixed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Role ARN:"
echo "  $ROLE_ARN"
echo ""
echo "Trust Policy allows:"
echo "  - Repository: $REPO_FULL_NAME"
echo "  - Any branch/environment in that repository"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Next Step:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add this Role ARN to your GitHub environment secret:"
echo ""
echo "1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/environments"
echo "2. Click: miraiprep-env"
echo "3. Add/Update secret: AWS_ROLE_ARN"
echo "4. Value: $ROLE_ARN"
echo ""
echo "Then re-run your GitHub Actions workflow."
echo ""
