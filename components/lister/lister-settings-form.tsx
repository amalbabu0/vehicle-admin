"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { changeListerEmail, changeListerPassword, deleteListerAccount, updateListerName, updateListerPhone } from "@/app/lister/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Feedback({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return <p role="status" className={error ? "text-sm text-destructive" : "text-sm text-emerald-600 dark:text-emerald-400"}>{error ?? message}</p>;
}

function SaveButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? "Saving…" : children}</Button>;
}

function PasswordInput({ id, name, label, autoComplete, value, onChange }: { id: string; name: string; label: string; autoComplete: string; value?: string; onChange?: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="pr-10" /><button type="button" onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>;
}

function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => [password.length >= 8, /[a-zA-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(Boolean).length, [password]);
  const label = score < 2 ? "Weak" : score < 4 ? "Fair" : "Strong";
  return <div className="space-y-1.5"><div className="flex justify-between text-xs text-muted-foreground"><span>Password strength</span><span>{label}</span></div><div className="flex gap-1" aria-label={`Password strength: ${label}`}>{[1, 2, 3, 4].map((part) => <span key={part} className={`h-1.5 flex-1 rounded-full ${part <= score ? score === 4 ? "bg-emerald-500" : score >= 2 ? "bg-amber-500" : "bg-destructive" : "bg-muted"}`} />)}</div></div>;
}

function ExpandableCard({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `lister-settings-${title.toLowerCase().replaceAll(" ", "-")}`;
  return <Card><button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-muted/50"><span><span className="block font-medium">{title}</span>{description && <span className="mt-1 block text-sm text-muted-foreground">{description}</span>}</span><ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <CardContent id={id} className="border-t pt-4">{children}</CardContent>}</Card>;
}

export function ListerSettingsForm({ name, phone, email }: { name: string | null; phone: string | null; email: string }) {
  const [nameState, nameAction, namePending] = useActionState(updateListerName, undefined);
  const [phoneState, phoneAction, phonePending] = useActionState(updateListerPhone, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState(changeListerPassword, undefined);
  const [emailState, emailAction, emailPending] = useActionState(changeListerEmail, undefined);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteListerAccount, undefined);
  const [newPassword, setNewPassword] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  return <div className="max-w-2xl space-y-5">
    <section className="space-y-3"><div><h2 className="text-base font-semibold">Profile</h2><p className="text-sm text-muted-foreground">Keep your lister contact details up to date.</p></div>
      <ExpandableCard title="Name"><form action={nameAction} className="space-y-3"><div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={name ?? ""} required maxLength={100} aria-invalid={nameState?.field === "name"} /></div><Feedback {...nameState} /><SaveButton pending={namePending}>Save Changes</SaveButton></form></ExpandableCard>
      <ExpandableCard title="Phone Number"><form action={phoneAction} className="space-y-3"><div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} required autoComplete="tel" aria-invalid={phoneState?.field === "phone"} /></div><Feedback {...phoneState} /><SaveButton pending={phonePending}>Save Changes</SaveButton></form></ExpandableCard>
    </section>

    <section className="space-y-3"><div><h2 className="text-base font-semibold">Security</h2><p className="text-sm text-muted-foreground">Changes require your current password.</p></div>
      <ExpandableCard title="Change Password" description="Use at least 8 characters with a letter, number, and special character."><form action={passwordAction} className="space-y-4"><PasswordInput id="currentPassword" name="currentPassword" label="Current Password" autoComplete="current-password" /><PasswordInput id="newPassword" name="newPassword" label="New Password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} /><PasswordStrength password={newPassword} /><PasswordInput id="confirmPassword" name="confirmPassword" label="Confirm New Password" autoComplete="new-password" /><Feedback {...passwordState} /><SaveButton pending={passwordPending}>Update Password</SaveButton></form></ExpandableCard>
      <ExpandableCard title="Change Email" description={<>Your current email is {email}. We will send confirmation instructions to complete the change.</>}><form action={emailAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">New Email</Label><Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={emailState?.field === "email"} /></div><PasswordInput id="emailCurrentPassword" name="currentPassword" label="Current Password" autoComplete="current-password" /><Feedback {...emailState} /><SaveButton pending={emailPending}>Change Email</SaveButton></form></ExpandableCard>
    </section>

    <section className="space-y-3"><div><h2 className="text-base font-semibold">Account</h2></div>
      <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteForm(!showDeleteForm)} aria-expanded={showDeleteForm} aria-controls="delete-account-form">Delete account</Button>{showDeleteForm && <div id="delete-account-form" className="rounded-xl border bg-card p-4"><h3 className="font-medium">Delete Account</h3><p className="mt-1 text-sm text-muted-foreground">Deleting your account permanently removes your lister profile and listings. Type DELETE and enter your password to continue.</p><form action={deleteAction} className="mt-4 space-y-4"><div className="space-y-2"><Label htmlFor="confirmation">Confirmation</Label><Input id="confirmation" name="confirmation" placeholder="DELETE" required aria-invalid={deleteState?.field === "confirmation"} /></div><PasswordInput id="deleteCurrentPassword" name="currentPassword" label="Current Password" autoComplete="current-password" /><Feedback {...deleteState} /><Button type="submit" variant="outline" disabled={deletePending}>{deletePending && <LoaderCircle className="size-4 animate-spin" />}{deletePending ? "Deleting…" : "Delete Account"}</Button></form></div>}
    </section>
  </div>;
}
