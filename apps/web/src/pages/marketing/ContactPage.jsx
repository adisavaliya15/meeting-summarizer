import { useState } from "react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";
import { useToast } from "../../components/ui/ToastProvider";

export default function ContactPage() {
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setName("");
    setEmail("");
    setMessage("");
    pushToast("Thanks. We received your message.", "success");
  }

  return (
    <div className="py-16">
      <SectionContainer>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Contact Summora</h1>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Have product feedback or questions? Send us a message and we will get back to you.
          </p>

          <Card className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="field-label">
                Name
                <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>

              <label className="field-label">
                Email
                <input type="email" className="input-base" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>

              <label className="field-label">
                Message
                <textarea
                  rows={5}
                  className="input-base"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                />
              </label>

              <Button type="submit" variant="primary">
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </SectionContainer>
    </div>
  );
}
