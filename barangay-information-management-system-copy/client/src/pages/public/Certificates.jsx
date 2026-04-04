/**
 * Certificates.jsx  — Public page /request
 *
 * The old walk-in certificate request form has been retired.
 * Certificate requests are now handled through two channels:
 *
 *   Online  → E-Services Portal (for registered residents)
 *   Walk-in → Visit your barangay hall during office hours
 */

import { Layout } from "@/components/common/Layout";
import { FileText, ArrowRight, MapPin } from "lucide-react";

export default function PublicCertificates() {
  const portalUrl = import.meta.env.VITE_ESERVICE_URL || null;

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-6">

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Certificate Requests Have Moved
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              You can now request barangay certificates online through the
              E-Services Portal, or visit your barangay hall in person.
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">

            {/* Option 1 — E-Services Portal */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                Online Portal
              </div>
              <p className="text-sm text-gray-500">
                Registered residents can submit requests, track status, and
                receive updates online.
              </p>
              {portalUrl ? (
                <a
                  href={portalUrl}
                  className="inline-block mt-1 text-sm font-medium text-primary hover:underline"
                >
                  Go to E-Services Portal →
                </a>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Ask your barangay or municipal office for the portal link.
                </p>
              )}
            </div>

            {/* Option 2 — Walk-in */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                Walk-in
              </div>
              <p className="text-sm text-gray-500">
                Visit your barangay hall during office hours. Bring a
                valid government-issued ID. Most certificates are released
                the same day.
              </p>
            </div>
          </div>

          {/* Track existing request */}
          <p className="text-sm text-gray-400">
            Already submitted a request?{" "}
            <a href="/track" className="text-primary font-medium hover:underline">
              Track it here →
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
