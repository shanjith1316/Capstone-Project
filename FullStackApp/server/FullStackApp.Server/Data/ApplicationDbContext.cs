using Microsoft.EntityFrameworkCore;
using FullStackApp.Server.Models;

namespace FullStackApp.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; }  // Users Table
        public DbSet<Message> Messages { get; set; }  // Messages Table ✅
    }
}
