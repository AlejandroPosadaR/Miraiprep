# Build stage
FROM maven:3-eclipse-temurin-25 AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy AWS RDS SSL certificate bundle and import all certs into Java truststore
COPY --from=build /app/src/main/resources/certs/global-bundle.pem /tmp/global-bundle.pem
RUN cd /tmp && \
    # Split bundle into individual certs
    csplit -f cert- -b %02d.pem global-bundle.pem '/-----BEGIN CERTIFICATE-----/' '{*}' 2>/dev/null || true && \
    # Import each cert into truststore
    for cert in cert-*.pem; do \
        if [ -s "$cert" ]; then \
            keytool -import -trustcacerts -alias "aws-rds-$cert" \
                -file "$cert" \
                -keystore $JAVA_HOME/lib/security/cacerts \
                -storepass changeit \
                -noprompt 2>/dev/null || true; \
        fi; \
    done && \
    rm -f /tmp/cert-*.pem /tmp/global-bundle.pem

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

