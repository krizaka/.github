# Fixture of the build pack (krizaka-ci.yml, krizaka/.github#113): no provider, nothing to create.
variable "name" {
  type    = string
  default = "krizaka"
}

output "greeting" {
  value = "hello ${var.name}"
}
