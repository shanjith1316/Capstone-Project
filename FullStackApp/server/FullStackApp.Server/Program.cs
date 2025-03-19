using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using FullStackApp.Server.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.SignalR;
using System.Text;
using FullStackApp.Server.Hubs;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// ✅ Load appsettings.json
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"]);

// ✅ Database Connection
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ✅ Configure JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"]
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chatHub"))
                {
                    context.Token = accessToken; // ✅ Allow SignalR to use JWT from query params
                }
                return Task.CompletedTask;
            }
        };
    });

// ✅ Register Controllers and Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ Configure CORS (Allow React Frontend & SignalR WebSockets)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
            .WithOrigins("http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetIsOriginAllowed(origin => true)); // ✅ Allow WebSockets
});

// ✅ Register SignalR Service
builder.Services.AddSignalR();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ Ensure Proper Routing
app.UseRouting();
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// ✅ Register Controllers BEFORE Debugging Logs
app.MapControllers(); 

// ✅ Register SignalR Hub with Authentication
app.MapHub<ChatHub>("/chatHub")
    .RequireAuthorization();  // ✅ Ensure SignalR users are authenticated

// ✅ Debug: Print All Loaded Controllers
var controllerTypes = Assembly.GetExecutingAssembly()
    .GetTypes()
    .Where(t => typeof(ControllerBase).IsAssignableFrom(t));

Console.WriteLine("\n📌 Loaded Controllers:");
foreach (var type in controllerTypes)
{
    Console.WriteLine($"✔ Found Controller: {type.FullName}");
}

// ✅ Debug: Print All Mapped Routes
var endpointDataSource = app.Services.GetRequiredService<EndpointDataSource>();

Console.WriteLine("\n🚀 API Endpoints Mapped Successfully:");
if (endpointDataSource.Endpoints.Any())
{
    foreach (var endpoint in endpointDataSource.Endpoints)
    {
        Console.WriteLine($"➡️  {endpoint.DisplayName}");
    }
}
else
{
    Console.WriteLine("⚠️  No API endpoints were mapped! Check your controller setup.");
}

Console.WriteLine("\n✅ API is now running on http://localhost:5137/");

app.Run();
