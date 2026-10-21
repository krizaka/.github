package com.krizaka.fixture;

/** The fixture of the java-ci.yml self-test. */
public final class Hello {
  private Hello() {}

  /** @return the greeting. */
  public static String greeting() {
    return "hello";
  }
}
