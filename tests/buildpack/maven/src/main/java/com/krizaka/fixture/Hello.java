package com.krizaka.fixture;

/** Fixture of the build pack. */
public final class Hello {
  private Hello() {}

  public static String greet(String name) {
    return "Hello, " + name;
  }
}
