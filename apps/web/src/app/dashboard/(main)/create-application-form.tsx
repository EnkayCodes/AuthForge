"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";

interface CreateApplicationFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateApplicationForm({ onCreated, onCancel }: CreateApplicationFormProps) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { ok, data } = await apiFetch("/applications", {
        method: "POST",
        body: JSON.stringify({ name, environment }),
      });

      if (!ok) {
        toast("error", (data as { message?: string }).message ?? "Failed to create application.");
        return;
      }

      toast("success", "Application created.");
      onCreated();
    } catch {
      toast("error", "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onCancel}
      title="Create Application"
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            loading={loading}
            onClick={() =>
              (document.getElementById("create-app-form") as HTMLFormElement | null)?.requestSubmit()
            }
          >
            Create
          </Button>
        </>
      }
    >
      <form id="create-app-form" onSubmit={handleSubmit} className="mt-2 space-y-4">
        <Input label="Name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" />
        <Select
          label="Environment"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          options={[
            { value: "development", label: "Development" },
            { value: "staging", label: "Staging" },
            { value: "production", label: "Production" },
          ]}
        />
      </form>
    </Dialog>
  );
}
