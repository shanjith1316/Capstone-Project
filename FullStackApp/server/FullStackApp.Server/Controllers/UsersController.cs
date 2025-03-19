
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

using FullStackApp.Server.Data;
using FullStackApp.Server.Models;
using System.Linq;

namespace FullStackApp.Server.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize]  // ✅ Protect this API
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ✅ Get All Users (Except the Logged-In User)
        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = _context.Users.Select(u => new { u.Id, u.Username }).ToList();
            return Ok(users);
        }
    }
}
