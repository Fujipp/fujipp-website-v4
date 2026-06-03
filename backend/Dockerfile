# syntax=docker/dockerfile:1

# ---- build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first (re-runs only when pom.xml changes)
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Build the Spring Boot fat jar (tests need a live DB, so they run in CI, not here)
COPY src ./src
RUN mvn -B -q -DskipTests package \
    && mv "$(find target -maxdepth 1 -name '*.jar')" /app/app.jar

# ---- runtime stage ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Run as a non-root user
RUN groupadd -r app && useradd -r -g app app
COPY --from=build /app/app.jar app.jar
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
