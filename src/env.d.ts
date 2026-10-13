/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    portfolio: import("./lib/cms").Portfolio;
  }
}
