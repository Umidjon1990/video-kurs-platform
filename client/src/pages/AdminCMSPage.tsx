import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageSquare, Save, Trash2, Plus, Star, Edit, ArrowLeft, Upload, X, Link2, ExternalLink } from "lucide-react";
import type { SiteSetting, Testimonial } from "@shared/schema";
import { useLocation } from "wouter";

export default function AdminCMSPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Site Settings state
  const [aboutUs, setAboutUs] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [certificateUrls, setCertificateUrls] = useState("");
  
  // Certificate upload state
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [uploadedCertificates, setUploadedCertificates] = useState<string[]>([]);
  
  // Footer links state
  interface FooterLink {
    href: string;
    label: string;
  }
  const [quickLinks, setQuickLinks] = useState<FooterLink[]>([
    { href: "/", label: "Bosh sahifa" },
    { href: "/login", label: "Kirish" },
    { href: "/register", label: "Ro'yxatdan o'tish" },
  ]);
  const [legalLinks, setLegalLinks] = useState<FooterLink[]>([
    { href: "/privacy", label: "Maxfiylik siyosati" },
    { href: "/terms", label: "Foydalanish shartlari" },
  ]);
  const [footerLinkDialogOpen, setFooterLinkDialogOpen] = useState(false);
  const [editingLinkType, setEditingLinkType] = useState<"quick" | "legal">("quick");
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkForm, setLinkForm] = useState({ href: "", label: "" });
  
  // Load uploaded certificates from certificateUrls
  useEffect(() => {
    if (certificateUrls) {
      const urls = certificateUrls.split('\n').filter(url => url.trim());
      setUploadedCertificates(urls);
    } else {
      setUploadedCertificates([]);
    }
  }, [certificateUrls]);
  
  // Testimonial dialog state
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    studentName: "",
    studentRole: "",
    content: "",
    rating: 5,
    order: 0,
    isPublished: true,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch site settings
  const { data: siteSettings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
    enabled: isAuthenticated,
  });

  // Fetch testimonials
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/admin/testimonials"],
    enabled: isAuthenticated,
  });

  // Load site settings into form
  useEffect(() => {
    if (siteSettings) {
      siteSettings.forEach(setting => {
        if (setting.key === "about_us") setAboutUs(setting.value || "");
        if (setting.key === "contact_email") setContactEmail(setting.value || "");
        if (setting.key === "contact_phone") setContactPhone(setting.value || "");
        if (setting.key === "contact_address") setContactAddress(setting.value || "");
        if (setting.key === "contact_telegram") setContactTelegram(setting.value || "");
        if (setting.key === "certificate_urls") setCertificateUrls(setting.value || "");
        if (setting.key === "footer_quick_links") {
          try {
            const parsed = JSON.parse(setting.value || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) setQuickLinks(parsed);
          } catch {}
        }
        if (setting.key === "footer_legal_links") {
          try {
            const parsed = JSON.parse(setting.value || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) setLegalLinks(parsed);
          } catch {}
        }
      });
    }
  }, [siteSettings]);

  // Update site setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("PUT", "/api/admin/site-settings", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Sozlamalar saqlandi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create testimonial mutation
  const createTestimonialMutation = useMutation({
    mutationFn: async (data: typeof testimonialForm) => {
      await apiRequest("POST", "/api/admin/testimonials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Fikr qo'shildi",
      });
      setTestimonialDialogOpen(false);
      resetTestimonialForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update testimonial mutation
  const updateTestimonialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof testimonialForm> }) => {
      await apiRequest("PUT", `/api/admin/testimonials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Fikr yangilandi",
      });
      setTestimonialDialogOpen(false);
      resetTestimonialForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete testimonial mutation
  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/testimonials/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Fikr o'chirildi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle certificate file upload
  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Xatolik",
        description: "Faqat rasm fayllari qabul qilinadi",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Xatolik",
        description: "Fayl hajmi 5MB dan oshmasligi kerak",
        variant: "destructive",
      });
      return;
    }

    setUploadingCertificate(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-certificate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Fayl yuklashda xatolik');
      }

      const data = await response.json();
      const newUrl = data.url;

      // Add to uploaded certificates
      const updatedUrls = [...uploadedCertificates, newUrl];
      setUploadedCertificates(updatedUrls);
      setCertificateUrls(updatedUrls.join('\n'));

      toast({
        title: "Muvaffaqiyatli",
        description: "Rasm yuklandi. Saqlash tugmasini bosing!",
      });

      // Clear the file input
      event.target.value = '';
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingCertificate(false);
    }
  };

  // Remove certificate from list
  const handleRemoveCertificate = (index: number) => {
    const updatedUrls = uploadedCertificates.filter((_, i) => i !== index);
    setUploadedCertificates(updatedUrls);
    setCertificateUrls(updatedUrls.join('\n'));
  };

  const saveSiteSettings = () => {
    updateSettingMutation.mutate({ key: "about_us", value: aboutUs });
    updateSettingMutation.mutate({ key: "contact_email", value: contactEmail });
    updateSettingMutation.mutate({ key: "contact_phone", value: contactPhone });
    updateSettingMutation.mutate({ key: "contact_address", value: contactAddress });
    updateSettingMutation.mutate({ key: "contact_telegram", value: contactTelegram });
    updateSettingMutation.mutate({ key: "certificate_urls", value: certificateUrls });
  };

  const saveFooterLinks = async () => {
    try {
      await apiRequest("PUT", "/api/admin/site-settings", { key: "footer_quick_links", value: JSON.stringify(quickLinks) });
      await apiRequest("PUT", "/api/admin/site-settings", { key: "footer_legal_links", value: JSON.stringify(legalLinks) });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Muvaffaqiyatli", description: "Footer havolalar saqlandi" });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    }
  };

  // Footer link management
  const handleAddLink = (type: "quick" | "legal") => {
    setEditingLinkType(type);
    setEditingLinkIndex(null);
    setLinkForm({ href: "", label: "" });
    setFooterLinkDialogOpen(true);
  };

  const handleEditLink = (type: "quick" | "legal", index: number) => {
    const links = type === "quick" ? quickLinks : legalLinks;
    setEditingLinkType(type);
    setEditingLinkIndex(index);
    setLinkForm(links[index]);
    setFooterLinkDialogOpen(true);
  };

  const handleSaveLink = () => {
    const trimmedHref = linkForm.href.trim();
    const trimmedLabel = linkForm.label.trim();
    
    if (!trimmedHref || !trimmedLabel) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    
    // Basic URL validation - must start with / or http
    if (!trimmedHref.startsWith("/") && !trimmedHref.startsWith("http")) {
      toast({ title: "Xatolik", description: "Link / yoki http bilan boshlanishi kerak", variant: "destructive" });
      return;
    }
    
    const validatedForm = { href: trimmedHref, label: trimmedLabel };
    
    if (editingLinkType === "quick") {
      if (editingLinkIndex !== null) {
        const updated = [...quickLinks];
        updated[editingLinkIndex] = validatedForm;
        setQuickLinks(updated);
      } else {
        setQuickLinks([...quickLinks, validatedForm]);
      }
    } else {
      if (editingLinkIndex !== null) {
        const updated = [...legalLinks];
        updated[editingLinkIndex] = validatedForm;
        setLegalLinks(updated);
      } else {
        setLegalLinks([...legalLinks, validatedForm]);
      }
    }
    setFooterLinkDialogOpen(false);
    toast({ title: "Muvaffaqiyatli", description: "Havola qo'shildi. Saqlash tugmasini bosing!" });
  };

  const handleDeleteLink = (type: "quick" | "legal", index: number) => {
    if (type === "quick") {
      setQuickLinks(quickLinks.filter((_, i) => i !== index));
    } else {
      setLegalLinks(legalLinks.filter((_, i) => i !== index));
    }
  };

  const resetTestimonialForm = () => {
    setTestimonialForm({
      studentName: "",
      studentRole: "",
      content: "",
      rating: 5,
      order: 0,
      isPublished: true,
    });
    setEditingTestimonial(null);
  };

  const handleCreateTestimonial = () => {
    createTestimonialMutation.mutate(testimonialForm);
  };

  const handleUpdateTestimonial = () => {
    if (!editingTestimonial) return;
    updateTestimonialMutation.mutate({
      id: editingTestimonial.id,
      data: testimonialForm,
    });
  };

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      studentName: testimonial.studentName,
      studentRole: testimonial.studentRole || "",
      content: testimonial.content,
      rating: testimonial.rating || 5,
      order: testimonial.order || 0,
      isPublished: testimonial.isPublished || true,
    });
    setTestimonialDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/admin')}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Orqaga
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-cms-title">Sayt Boshqaruvi</h1>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-6xl">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Sayt Sozlamalari
            </TabsTrigger>
            <TabsTrigger value="footer" data-testid="tab-footer">
              <Link2 className="w-4 h-4 mr-2" />
              Footer Havolalar
            </TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials">
              <MessageSquare className="w-4 h-4 mr-2" />
              Talabalar Fikrlari
            </TabsTrigger>
          </TabsList>

          {/* Site Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Sayt Sozlamalari</CardTitle>
                <CardDescription>
                  Bosh sahifa uchun ma'lumotlarni tahrirlang
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="about-us">Biz haqimizda</Label>
                  <Textarea
                    id="about-us"
                    data-testid="input-about-us"
                    placeholder="Platformamiz haqida qisqacha..."
                    value={aboutUs}
                    onChange={(e) => setAboutUs(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      data-testid="input-contact-email"
                      type="email"
                      placeholder="info@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Telefon</Label>
                    <Input
                      id="contact-phone"
                      data-testid="input-contact-phone"
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-address">Manzil</Label>
                  <Input
                    id="contact-address"
                    data-testid="input-contact-address"
                    placeholder="Toshkent, O'zbekiston"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-telegram">Telegram</Label>
                  <Input
                    id="contact-telegram"
                    data-testid="input-contact-telegram"
                    placeholder="https://t.me/username"
                    value={contactTelegram}
                    onChange={(e) => setContactTelegram(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Telegram kanal yoki guruh havolasi (masalan: https://t.me/your_channel)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Guvohnoma va Litsenziya Rasmlari</Label>
                    <div>
                      <input
                        type="file"
                        id="certificate-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCertificateUpload}
                        data-testid="input-upload-certificate"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('certificate-upload')?.click()}
                        disabled={uploadingCertificate}
                        data-testid="button-upload-certificate"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingCertificate ? "Yuklanmoqda..." : "Rasm Yuklash"}
                      </Button>
                    </div>
                  </div>

                  {uploadedCertificates.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedCertificates.map((url, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg overflow-hidden border bg-card aspect-[4/5]"
                          data-testid={`preview-certificate-${index}`}
                        >
                          <img
                            src={url}
                            alt={`Sertifikat ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveCertificate(index)}
                            data-testid={`button-remove-certificate-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Rasm yuklang yoki quyida URL kiriting. Rasmlar bosh sahifada carousel ko'rinishida ko'rsatiladi.
                  </p>

                  <Textarea
                    id="certificate-urls"
                    data-testid="input-certificate-urls"
                    placeholder="Yoki qo'lda URL kiriting (har bir qatorda bitta)&#10;https://example.com/certificate1.jpg"
                    value={certificateUrls}
                    onChange={(e) => setCertificateUrls(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={saveSiteSettings}
                  disabled={updateSettingMutation.isPending}
                  data-testid="button-save-settings"
                  className="w-full md:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Footer Links Tab */}
          <TabsContent value="footer">
            <div className="space-y-6">
              {/* Quick Links Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle>Tezkor Havolalar</CardTitle>
                      <CardDescription>
                        Footer "Tezkor havolalar" bo'limidagi linklar
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleAddLink("quick")} data-testid="button-add-quick-link">
                      <Plus className="w-4 h-4 mr-2" />
                      Havola qo'shish
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomi</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="w-24">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quickLinks.map((link, index) => (
                        <TableRow key={index}>
                          <TableCell>{link.label}</TableCell>
                          <TableCell className="text-muted-foreground">{link.href}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditLink("quick", index)} data-testid={`button-edit-quick-${index}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLink("quick", index)} data-testid={`button-delete-quick-${index}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Legal Links Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle>Huquqiy Havolalar</CardTitle>
                      <CardDescription>
                        Footer "Huquqiy" bo'limidagi linklar
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleAddLink("legal")} data-testid="button-add-legal-link">
                      <Plus className="w-4 h-4 mr-2" />
                      Havola qo'shish
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomi</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="w-24">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legalLinks.map((link, index) => (
                        <TableRow key={index}>
                          <TableCell>{link.label}</TableCell>
                          <TableCell className="text-muted-foreground">{link.href}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditLink("legal", index)} data-testid={`button-edit-legal-${index}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLink("legal", index)} data-testid={`button-delete-legal-${index}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Button onClick={saveFooterLinks} disabled={updateSettingMutation.isPending} data-testid="button-save-footer-links">
                <Save className="w-4 h-4 mr-2" />
                {updateSettingMutation.isPending ? "Saqlanmoqda..." : "Havolalarni Saqlash"}
              </Button>
            </div>

            {/* Footer Link Dialog */}
            <Dialog open={footerLinkDialogOpen} onOpenChange={setFooterLinkDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingLinkIndex !== null ? "Havolani tahrirlash" : "Yangi havola qo'shish"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLinkType === "quick" ? "Tezkor havola" : "Huquqiy havola"} ma'lumotlarini kiriting
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="link-label">Havola nomi</Label>
                    <Input
                      id="link-label"
                      data-testid="input-link-label"
                      placeholder="Masalan: Biz haqimizda"
                      value={linkForm.label}
                      onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link-href">Link manzili</Label>
                    <Input
                      id="link-href"
                      data-testid="input-link-href"
                      placeholder="Masalan: /about yoki https://example.com"
                      value={linkForm.href}
                      onChange={(e) => setLinkForm({ ...linkForm, href: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Ichki sahifalar uchun / bilan boshlang. Tashqi sahifalar uchun to'liq URL kiriting.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setFooterLinkDialogOpen(false)}>
                      Bekor qilish
                    </Button>
                    <Button onClick={handleSaveLink} data-testid="button-save-link">
                      Saqlash
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Talabalar Fikrlari</CardTitle>
                    <CardDescription>
                      Bosh sahifada ko'rsatiladigan talabalar fikrlarini boshqaring
                    </CardDescription>
                  </div>
                  <Dialog open={testimonialDialogOpen} onOpenChange={(open) => {
                    setTestimonialDialogOpen(open);
                    if (!open) resetTestimonialForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-testimonial">
                        <Plus className="w-4 h-4 mr-2" />
                        Yangi fikr
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTestimonial ? "Fikrni tahrirlash" : "Yangi fikr qo'shish"}
                        </DialogTitle>
                        <DialogDescription>
                          Talaba fikri ma'lumotlarini kiriting
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="student-name">Talaba ismi</Label>
                            <Input
                              id="student-name"
                              data-testid="input-student-name"
                              value={testimonialForm.studentName}
                              onChange={(e) => setTestimonialForm({ ...testimonialForm, studentName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-role">Lavozim/Kasb</Label>
                            <Input
                              id="student-role"
                              data-testid="input-student-role"
                              placeholder="Dasturchi"
                              value={testimonialForm.studentRole}
                              onChange={(e) => setTestimonialForm({ ...testimonialForm, studentRole: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="content">Fikr matni</Label>
                          <Textarea
                            id="content"
                            data-testid="input-content"
                            rows={4}
                            value={testimonialForm.content}
                            onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="rating">Reyting (1-5)</Label>
                            <Input
                              id="rating"
                              data-testid="input-rating"
                              type="number"
                              min="1"
                              max="5"
                              value={testimonialForm.rating}
                              onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: parseInt(e.target.value) || 5 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="order">Tartib</Label>
                            <Input
                              id="order"
                              data-testid="input-order"
                              type="number"
                              value={testimonialForm.order}
                              onChange={(e) => setTestimonialForm({ ...testimonialForm, order: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is-published"
                            data-testid="input-is-published"
                            checked={testimonialForm.isPublished}
                            onChange={(e) => setTestimonialForm({ ...testimonialForm, isPublished: e.target.checked })}
                            className="rounded"
                          />
                          <Label htmlFor="is-published">Bosh sahifada ko'rsatish</Label>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={editingTestimonial ? handleUpdateTestimonial : handleCreateTestimonial}
                            disabled={createTestimonialMutation.isPending || updateTestimonialMutation.isPending}
                            data-testid="button-save-testimonial"
                            className="flex-1"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {(createTestimonialMutation.isPending || updateTestimonialMutation.isPending) ? "Saqlanmoqda..." : "Saqlash"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setTestimonialDialogOpen(false)}
                            data-testid="button-cancel-testimonial"
                          >
                            Bekor qilish
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!testimonials || testimonials.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Hali fikrlar yo'q. Birinchi fikrni qo'shing!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Talaba</TableHead>
                        <TableHead>Fikr</TableHead>
                        <TableHead>Reyting</TableHead>
                        <TableHead>Holat</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testimonials.map((testimonial) => (
                        <TableRow key={testimonial.id} data-testid={`row-testimonial-${testimonial.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{testimonial.studentName}</div>
                              {testimonial.studentRole && (
                                <div className="text-sm text-muted-foreground">{testimonial.studentRole}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="line-clamp-2">{testimonial.content}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${testimonial.isPublished ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>
                              {testimonial.isPublished ? 'Faol' : 'Yashirin'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTestimonial(testimonial)}
                                data-testid={`button-edit-${testimonial.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Rostdan ham o'chirmoqchimisiz?")) {
                                    deleteTestimonialMutation.mutate(testimonial.id);
                                  }
                                }}
                                data-testid={`button-delete-${testimonial.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
