# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore
COPY ["src/BookingSystem.Api/BookingSystem.Api.csproj", "src/BookingSystem.Api/"]
RUN dotnet restore "src/BookingSystem.Api/BookingSystem.Api.csproj"

# Copy source code and build
COPY src/ src/
WORKDIR "/src/src/BookingSystem.Api"
RUN dotnet publish "BookingSystem.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "BookingSystem.Api.dll"]
