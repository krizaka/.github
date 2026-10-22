#!/usr/bin/env bash
# Stand-in for a linter: fails on a tab character in the tests.
! grep -P '\t' test_*.py
