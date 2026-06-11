'use client';

import { useTranslations } from "next-intl";
import { Button } from "./Button";
import { Send, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useContactForm } from "./contact/useContactForm";
import { ContactSuccess } from "./contact/ContactSuccess";
import { ContactField } from "./contact/ContactField";
import { MathChallenge } from "./contact/MathChallenge";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const { 
    status, 
    errorMessage, 
    cooldown, 
    challenge, 
    handleSubmit, 
    resetForm 
  } = useContactForm();

  if (status === "success") {
    return <ContactSuccess onReset={resetForm} t={t} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-labelledby="contact-title">
      {/* Honeypot Field (Hidden for humans) */}
      <div className="sr-only opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <input type="text" name="bot_field" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ContactField 
          id="name" 
          label={t("name")} 
          name="name" 
          placeholder={t("namePlaceholder")} 
        />
        <ContactField 
          id="email" 
          label={t("email")} 
          name="email" 
          type="email" 
          placeholder={t("emailPlaceholder")} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ContactField 
          id="subject" 
          label={t("subject")} 
          name="subject" 
          placeholder={t("subjectPlaceholder")} 
          className="md:col-span-2"
        />
        <MathChallenge challenge={challenge} label={t("challenge")} />
      </div>

      <ContactField 
        id="message" 
        label={t("message")} 
        name="message" 
        placeholder={t("messagePlaceholder")} 
        isTextArea 
        rows={6} 
      />

      <AnimatePresence>
        {status === "error" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle size={18} />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={status === "loading" || cooldown}
        className="w-full py-8 text-sm uppercase tracking-widest font-black bg-primary text-zinc-950 group"
      >
        {status === "loading" ? (
          <Loader2 className="animate-spin mr-2" size={20} />
        ) : (
          <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform mr-2" size={20} />
        )}
        {t("submit")}
      </Button>

      {/* Security Notice */}
      <p className="text-[9px] text-zinc-700 uppercase tracking-widest text-center">
        {t("security")}
      </p>
    </form>
  );
}
