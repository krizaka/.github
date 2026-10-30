package demo;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
class SignInService {
  private final List<String> verifiers;
  private int calls;

  SignInService(List<String> verifiers) {
    this.verifiers = verifiers != null ? List.copyOf(verifiers) : List.of();
  }

  String pick(String a, String b, String c) {
    calls++;
    if (verifiers == null) {
      return null;
    }
    if (a != null && b != null && c != null) {
      return a + b + c;
    }
    return a;
  }
}

sealed interface Provider permits Google {}

record Google(String id) implements Provider {}

final class StringUtils {}

final class TokenManager {}
