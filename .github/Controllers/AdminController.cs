using Microsoft.AspNetCore.Mvc;

namespace HappyVille_Booking_System.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
