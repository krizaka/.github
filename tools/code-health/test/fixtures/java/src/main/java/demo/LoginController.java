package demo;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class LoginController {
  private final UserRepository users;

  LoginController(UserRepository users) {
    this.users = users;
  }

  String login(@RequestBody LoginRequest req, @RequestBody String raw) {
    if (req.provider().equals("google")) {
      return "g";
    } else if (req.provider().equals("github")) {
      return "h";
    } else if (req.provider().equals("apple")) {
      return "a";
    }
    return switch (req.provider()) {
      case "x" -> "1";
      case "y" -> "2";
      case "z" -> "3";
      default -> "0";
    };
  }
}
