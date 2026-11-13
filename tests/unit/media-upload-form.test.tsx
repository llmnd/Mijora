import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImageUploadForm } from "@/features/media/image-upload-form";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("image upload form", () => {
  it("submits image credits and the target to the media endpoint", async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    const image = {
      id: "image-1",
      key: "dishes/image-1.webp",
      url: "https://signed.example/image",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ data: image }, { status: 201 }),
      );

    render(
      <ImageUploadForm
        onUploaded={onUploaded}
        ownerId="dish-1"
        ownerType="dish"
      />,
    );

    await user.upload(
      screen.getByLabelText(/Image/),
      new File(["image bytes"], "dish.webp", { type: "image/webp" }),
    );
    await user.type(
      screen.getByLabelText(/Créateur ou photographe/),
      "Awa",
    );
    await user.type(screen.getByLabelText(/Provenance/), "Photo fournie");
    await user.type(
      screen.getByLabelText(/Licence ou autorisation/),
      "Accord",
    );
    await user.click(screen.getByRole("button", { name: "Téléverser l’image" }));

    await screen.findByRole("link", { name: "Ouvrir l’aperçu temporaire" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/media",
      expect.objectContaining({ method: "POST" }),
    );
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("ownerType")).toBe("dish");
    expect((body as FormData).get("ownerId")).toBe("dish-1");
    expect((body as FormData).get("creator")).toBe("Awa");
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(image));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("allows uploading a personal image without source or license fields", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          data: {
            id: "image-2",
            key: "dishes/image-2.webp",
            url: "https://signed.example/image-2",
          },
        },
        { status: 201 },
      ),
    );

    render(
      <ImageUploadForm ownerId="dish-1" ownerType="dish" />,
    );

    expect(
      screen.getByLabelText(/Créateur ou photographe/),
    ).not.toBeRequired();
    expect(screen.getByLabelText(/Provenance ou source/)).not.toBeRequired();
    expect(
      screen.getByLabelText(/Licence ou autorisation/),
    ).not.toBeRequired();

    await user.upload(
      screen.getByLabelText(/Image/),
      new File(["image bytes"], "personal.webp", { type: "image/webp" }),
    );
    await user.click(screen.getByRole("button", { name: "Téléverser l’image" }));

    await screen.findByRole("link", { name: "Ouvrir l’aperçu temporaire" });
    const formData = vi.mocked(globalThis.fetch).mock.calls[0]?.[1]?.body;
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("provenance")).toBe("");
    expect((formData as FormData).get("license")).toBe("");
  });
});
