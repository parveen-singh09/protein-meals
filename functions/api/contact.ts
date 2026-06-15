export async function onRequest(context: { request: Request; env: { EMAIL: { send: (args: { to: string; from: { email: string; name: string }; replyTo: string; subject: string; html: string; text: string }) => Promise<void> } } }) {
  const request = context.request;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const name = (formData.get("name") as string) || "Anonymous";
    const email = (formData.get("email") as string) || "no-reply@example.com";
    const subject = (formData.get("subject") as string) || "General Inquiry";
    const message = (formData.get("message") as string) || "";

    if (!message) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/contact?error=missing" },
      });
    }

    const html = `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px">
        <tr><td style="padding:8px;font-weight:600;border:1px solid #ddd">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #ddd">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #ddd">Subject</td><td style="padding:8px;border:1px solid #ddd">${subject}</td></tr>
        <tr><td style="padding:8px;font-weight:600;border:1px solid #ddd">Message</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>
      </table>
    `;

    if (context.env && context.env.EMAIL && typeof context.env.EMAIL.send === "function") {
      await context.env.EMAIL.send({
        to: "contactfeedback9@gmail.com",
        from: { email: "contact@highproteinfoodz.com", name: "HighProtein Foodz" },
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        html,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
      });
    } else {
      console.warn("EMAIL binding not configured or unavailable. Logging email content to console:");
      console.log({
        to: "contactfeedback9@gmail.com",
        from: "contact@highproteinfoodz.com",
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/contact?success=true" },
    });
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "/contact?error=server" },
    });
  }
}
