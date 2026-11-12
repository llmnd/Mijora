import { describe, expect, it } from "vitest";
import {
  createPasswordResetEmail,
  createVerificationEmail,
} from "@/lib/email/templates";

describe("transactional email templates", () => {
  it("escapes query delimiters in action links for HTML", () => {
    const email = createPasswordResetEmail(
      "reader@example.invalid",
      "https://mijora.example/reset?token=sample&source=test",
    );

    expect(email.html).toContain("token=sample&amp;source=test");
    expect(email.text).toContain("token=sample&source=test");
  });

  it("rejects non-web action URLs", () => {
    expect(() =>
      createVerificationEmail(
        "reader@example.invalid",
        "javascript:alert(1)",
      ),
    ).toThrow("Email action URL must use HTTP or HTTPS.");
  });
});
