import { Send } from "lucide-react";
import { useState } from "react";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import SectionContainer from "../../components/ui/SectionContainer";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/ToastProvider";

export default function ContactPage() {
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill all fields before sending your message.");
      return;
    }

    setError("");
    setName("");
    setEmail("");
    setMessage("");
    pushToast("Thanks, we received your message.", "success");
  }

  return (
    <div className="py-16">
      <SectionContainer>
        <div className="mx-auto max-w-3xl">
          <Badge tone="brand">Contact</Badge>
          <h1 className="mt-4">Talk to the Summora team</h1>
          <p className="mt-3 text-base text-muted">Have product feedback or setup questions? Send us a message.</p>

          <Card className="mt-8 p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="field-label">
                Name
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>

              <label className="field-label">
                Email
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>

              <label className="field-label">
                Message
                <Textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} required />
              </label>

              {error ? <div className="alert-error">{error}</div> : null}

              <Button type="submit">
                <Send className="h-4 w-4" />
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </SectionContainer>
    </div>
  );
}