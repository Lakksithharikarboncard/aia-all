"use client";

import * as React from "react";
import {
  CheckCircle2,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MODULES, saveLead, addAuditEntry } from "@/lib/billing";
import type { ModuleId, Lead } from "@/lib/billing";

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
  accountingSoftware: "tally" | "zoho" | "excel" | "other";
  expectedBills: string;
  expectedInvoices: string;
  expectedStatements: string;
  requestedModules: ModuleId[];
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  role: "",
  accountingSoftware: "tally",
  expectedBills: "",
  expectedInvoices: "",
  expectedStatements: "",
  requestedModules: [],
  notes: "",
};

export function LeadCaptureForm() {
  const [form, setForm] = React.useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const toggleModule = (moduleId: ModuleId) => {
    setForm((prev) => ({
      ...prev,
      requestedModules: prev.requestedModules.includes(moduleId)
        ? prev.requestedModules.filter((m) => m !== moduleId)
        : [...prev.requestedModules, moduleId],
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.company.trim()) newErrors.company = "Company is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const leadId = `lead_${Date.now()}`;
    const lead: Lead = {
      id: leadId,
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role.trim(),
      expectedBills: parseInt(form.expectedBills || "0", 10),
      expectedInvoices: parseInt(form.expectedInvoices || "0", 10),
      expectedStatements: parseInt(form.expectedStatements || "0", 10),
      accountingSoftware: form.accountingSoftware,
      requestedModules: form.requestedModules,
      status: "new",
      source: "website",
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    saveLead(lead);
    addAuditEntry({
      actor: "Website Visitor",
      action: "lead_submitted",
      entityType: "lead",
      entityId: leadId,
      reason: "Lead submitted via website form",
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-md border border-[#d0d7de] p-10 text-center shadow-[0_1px_3px_rgba(31,35,40,0.12),0_1px_0_rgba(31,35,40,0.04)]">
          <div className="w-16 h-16 bg-[#dafbe1] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#1a7f37]" />
          </div>
          <h2 className="text-xl font-bold text-[#1f2328] mb-3">You're all set!</h2>
          <p className="text-[#656d76] leading-relaxed">
            We received your details. Our team will review the setup and get back to you within one business day.
          </p>
          <div className="mt-8 pt-6 border-t border-[#f0f2f4]">
            <p className="text-sm text-[#656d76]">
              Questions? Email us at{" "}
              <a
                href="mailto:cs@korefi.ai"
                className="text-[#0969da] font-medium hover:underline"
              >
                cs@korefi.ai
              </a>
            </p>
          </div>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => {
              setForm(INITIAL_STATE);
              setSubmitted(false);
            }}
          >
            Submit another enquiry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-10 pb-12">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#0969da] rounded-xl shadow-sm mb-4">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#1f2328] mb-2">Get started with AIA</h1>
        <p className="text-[#656d76] text-base">
          Share the basics and we&apos;ll recommend the right billing and automation setup.
        </p>
        <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#d0d7de] bg-white px-4 py-2 text-xs font-medium text-[#656d76] shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <span>No commitment</span>
          <span className="h-1 w-1 rounded-full bg-[#d0d7de]" />
          <span>Simple onboarding</span>
          <span className="h-1 w-1 rounded-full bg-[#d0d7de]" />
          <span>Response within one business day</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Contact Information */}
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <h2 className="text-base font-semibold text-[#1f2328] mb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0969da]" />
            Contact Information
          </h2>
          <p className="mb-5 text-sm text-[#656d76]">Only the essentials for follow-up and setup.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Full Name <span className="text-[#cf222e]">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Rajesh Sharma"
                className={cn(
                  "w-full h-9 px-3 rounded-md border shadow-[0_1px_0_rgba(31,35,40,0.04)] outline-none text-sm",
                  errors.name
                    ? "border-[#cf222e]"
                    : "border-[#d0d7de]"
                )}
              />
              {errors.name && (
                <p className="text-xs text-[#cf222e] mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Company <span className="text-[#cf222e]">*</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="Acme Industries Pvt Ltd"
                className={cn(
                  "w-full h-9 px-3 rounded-md border shadow-[0_1px_0_rgba(31,35,40,0.04)] outline-none text-sm",
                  errors.company
                    ? "border-[#cf222e]"
                    : "border-[#d0d7de]"
                )}
              />
              {errors.company && (
                <p className="text-xs text-[#cf222e] mt-1">{errors.company}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Email Address <span className="text-[#cf222e]">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="rajesh@acme.in"
                className={cn(
                  "w-full h-9 px-3 rounded-md border shadow-[0_1px_0_rgba(31,35,40,0.04)] outline-none text-sm",
                  errors.email
                    ? "border-[#cf222e]"
                    : "border-[#d0d7de]"
                )}
              />
              {errors.email && (
                <p className="text-xs text-[#cf222e] mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Phone <span className="text-[#cf222e]">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className={cn(
                  "w-full h-9 px-3 rounded-md border shadow-[0_1px_0_rgba(31,35,40,0.04)] outline-none text-sm",
                  errors.phone
                    ? "border-[#cf222e]"
                    : "border-[#d0d7de]"
                )}
              />
              {errors.phone && (
                <p className="text-xs text-[#cf222e] mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Your Role / Designation
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                placeholder="CFO, Finance Manager, Accountant..."
                className="w-full h-9 px-3 rounded-md border border-[#d0d7de] outline-none text-sm shadow-[0_1px_0_rgba(31,35,40,0.04)]"
              />
            </div>
          </div>
        </div>

        {/* Accounting Software */}
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <h2 className="text-base font-semibold text-[#1f2328] mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#0969da]" />
            Accounting Software
          </h2>
          <p className="mb-5 text-sm text-[#656d76]">Choose the system you currently work with most.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["tally", "zoho", "excel", "other"] as const).map((sw) => (
              <label
                key={sw}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-md border cursor-pointer transition-all text-sm font-medium",
                  form.accountingSoftware === sw
                    ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
                    : "border-[#d0d7de] text-[#656d76] hover:border-[#8b949e]"
                )}
              >
                <input
                  type="radio"
                  name="accountingSoftware"
                  value={sw}
                  checked={form.accountingSoftware === sw}
                  onChange={() => setField("accountingSoftware", sw)}
                  className="sr-only"
                />
                {sw.charAt(0).toUpperCase() + sw.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Expected Volume */}
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <h2 className="text-base font-semibold text-[#1f2328] mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0969da]" />
            Expected Monthly Volume
          </h2>
          <p className="text-sm text-[#656d76] mb-5">
            Approximate volumes help us recommend the right plan faster.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Bills / month
              </label>
              <input
                type="number"
                min="0"
                value={form.expectedBills}
                onChange={(e) => setField("expectedBills", e.target.value)}
                placeholder="e.g. 150"
                className="w-full h-9 px-3 rounded-md border border-[#d0d7de] outline-none text-sm shadow-[0_1px_0_rgba(31,35,40,0.04)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Invoices / month
              </label>
              <input
                type="number"
                min="0"
                value={form.expectedInvoices}
                onChange={(e) => setField("expectedInvoices", e.target.value)}
                placeholder="e.g. 100"
                className="w-full h-9 px-3 rounded-md border border-[#d0d7de] outline-none text-sm shadow-[0_1px_0_rgba(31,35,40,0.04)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1.5">
                Bank Statements / month
              </label>
              <input
                type="number"
                min="0"
                value={form.expectedStatements}
                onChange={(e) => setField("expectedStatements", e.target.value)}
                placeholder="e.g. 10"
                className="w-full h-9 px-3 rounded-md border border-[#d0d7de] outline-none text-sm shadow-[0_1px_0_rgba(31,35,40,0.04)]"
              />
            </div>
          </div>
        </div>

        {/* Modules Needed */}
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <h2 className="text-base font-semibold text-[#1f2328] mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0969da]" />
            Modules You Need
          </h2>
          <p className="text-sm text-[#656d76] mb-5">Select the workflows you want help with.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((module) => (
              <label
                key={module.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-md border cursor-pointer transition-all",
                  form.requestedModules.includes(module.id)
                    ? "border-[#a6d1f6] bg-[#ddf4ff]"
                    : "border-[#d0d7de] hover:border-[#8b949e]"
                )}
              >
                <input
                  type="checkbox"
                  checked={form.requestedModules.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                  className="mt-0.5 h-4 w-4 text-[#0969da] border-[#d0d7de] rounded"
                />
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      form.requestedModules.includes(module.id)
                        ? "text-[#0969da]"
                        : "text-[#1f2328]"
                    )}
                  >
                    {module.name}
                  </p>
                  <p className="text-xs text-[#656d76] mt-0.5">{module.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <h2 className="text-base font-semibold text-[#1f2328] mb-1 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0969da]" />
            Additional Notes
          </h2>
          <p className="text-sm text-[#656d76] mb-4">
            Optional: timelines, compliance needs, or anything the team should factor in.
          </p>
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={4}
            placeholder="e.g. We want to automate reconciliation before the next quarterly close."
            className="w-full px-3 py-2 rounded-md border border-[#d0d7de] outline-none text-sm resize-none shadow-[0_1px_0_rgba(31,35,40,0.04)]"
          />
        </div>

        {/* Submit */}
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#1f2328]">Ready to submit?</p>
              <p className="text-xs text-[#656d76] mt-0.5">
                A short review, then a tailored setup recommendation.
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="shrink-0"
            >
              Submit Enquiry
            </Button>
          </div>
          <p className="text-xs text-[#8b949e] mt-4 border-t border-[#f0f2f4] pt-4">
            We only use these details to contact you about setup and onboarding.
          </p>
        </div>
      </form>
    </div>
  );
}
