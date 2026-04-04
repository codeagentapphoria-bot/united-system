import { Layout } from "@/components/common/Layout";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBarangay } from "@/contexts/BarangayContext";

const Contact = () => {
  const { selectedBarangay, availableBarangays } = useBarangay();
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-6 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Contact {selectedBarangay?.name || "Your"} Barangay
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Need assistance? Contact the{" "}
              {selectedBarangay?.name || "Barangay"} Hall for inquiries,
              services, and community support.
            </p>
            {!selectedBarangay && (
              <div className="mt-3 sm:mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg max-w-md mx-auto">
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                  <strong>Select a Barangay:</strong> Choose your barangay from
                  the dropdown below to see specific contact information.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Information */}
            <div className="space-y-4 sm:space-y-6 animate-slide-up">
              {/* Phone */}
              <div className="bg-gradient-card rounded-xl p-4 sm:p-6 shadow-soft hover-lift">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-primary/10 rounded-lg mr-3 sm:mr-4">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">Phone</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">Call us directly</p>
                  </div>
                </div>
                <p className="text-foreground font-medium text-sm sm:text-base">
                  {selectedBarangay?.contactNumber &&
                  selectedBarangay.contactNumber !== "N/A"
                    ? selectedBarangay.contactNumber
                    : "Contact information not available"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedBarangay?.contactNumber &&
                  selectedBarangay.contactNumber !== "N/A"
                    ? "Mon-Fri 8AM-5PM"
                    : "Please visit the barangay hall"}
                </p>
              </div>

              {/* Email */}
              <div className="bg-gradient-card rounded-xl p-4 sm:p-6 shadow-soft hover-lift">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-accent/10 rounded-lg mr-3 sm:mr-4">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">Email</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">Send us a message</p>
                  </div>
                </div>
                <p className="text-foreground font-medium text-sm sm:text-base">
                  {selectedBarangay?.email
                    ? selectedBarangay.email
                    : "Email not available"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedBarangay?.email
                    ? "48 hour response time"
                    : "Please call or visit the barangay hall"}
                </p>
              </div>

              {/* Address */}
              <div className="bg-gradient-card rounded-xl p-4 sm:p-6 shadow-soft hover-lift">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-royal/10 rounded-lg mr-3 sm:mr-4">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-royal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      Barangay Hall Address
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">Visit our office</p>
                  </div>
                </div>
                <p className="text-foreground font-medium text-sm sm:text-base">
                  {selectedBarangay?.name || "Barangay"} Hall
                  <br />
                  {selectedBarangay?.address &&
                  selectedBarangay.address !== "N/A"
                    ? selectedBarangay.address
                    : "Address not available"}
                  <br />
                  {selectedBarangay?.municipality_name ||
                    "Municipality information not available"}
                </p>
              </div>

              {/* Hours */}
              <div className="bg-gradient-card rounded-xl p-4 sm:p-6 shadow-soft hover-lift">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-navy/10 rounded-lg mr-3 sm:mr-4">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      Business Hours
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      When we're available
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Monday - Friday
                    </span>
                    <span className="text-foreground">8:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturday</span>
                    <span className="text-foreground">8:00 AM - 12:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sunday</span>
                    <span className="text-foreground">Closed</span>
                  </div>
                  {(!selectedBarangay?.contactNumber ||
                    selectedBarangay.contactNumber === "N/A") &&
                    !selectedBarangay?.email && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                        ⚠️ Contact information not available. Please visit the
                        barangay hall directly.
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div
              className="lg:col-span-2 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="bg-gradient-card rounded-xl p-4 sm:p-6 lg:p-8 shadow-soft">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">
                  Send us a Message
                </h2>

                <form className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Enter your last name" 
                        className="text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-sm sm:text-base">Subject</Label>
                    <Input 
                      id="subject" 
                      placeholder="What is this regarding?" 
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="barangay" className="text-sm sm:text-base">Select Barangay</Label>
                    <select
                      id="barangay"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
                      defaultValue={selectedBarangay?.id || ""}
                    >
                      <option value="">Choose your barangay</option>
                      {availableBarangays.map((barangay) => (
                        <option key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm sm:text-base">Category</Label>
                    <select
                      id="category"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm sm:text-base"
                    >
                      <option>General Inquiry</option>
                      <option>Certificate Request</option>
                      <option>Barangay Services</option>
                      <option>Community Complaint</option>
                      <option>Feedback/Suggestion</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm sm:text-base">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us how we can help you..."
                      rows={6}
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <Button size="lg" className="w-full text-sm sm:text-base">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>

                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    <strong>Response Time:</strong> We typically respond to all
                    inquiries within 24 hours during business days. For urgent
                    matters, please call us directly.
                  </p>
                  {!selectedBarangay && (
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-2">
                      <strong>Note:</strong> Please select a barangay above to
                      see specific contact information.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
