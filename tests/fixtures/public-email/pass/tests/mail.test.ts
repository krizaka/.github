// A test may spell an address.
test("spells an address", () => {
  expect("contact@krizaka.com").toContain("@");
});
