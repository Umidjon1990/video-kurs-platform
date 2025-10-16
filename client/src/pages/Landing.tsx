import { Button } from "@/components/ui/button";
import { BookOpen, Users, Award, Video } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold" data-testid="text-hero-title">
              Video Kurslar Platformasi
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-hero-description">
              Professional o'qituvchilardan sifatli video darslar. O'rganing, rivojlaning va muvaffaqiyatga erishing.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-get-started"
              >
                Boshlash
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Kirish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Platformaning Imkoniyatlari</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center space-y-4" data-testid="feature-courses">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Turli Xil Kurslar</h3>
            <p className="text-muted-foreground">
              Eng yaxshi o'qituvchilardan professional video kurslar
            </p>
          </div>

          <div className="text-center space-y-4" data-testid="feature-instructors">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Tajribali O'qituvchilar</h3>
            <p className="text-muted-foreground">
              Sohadagi mutaxassislardan o'rganing
            </p>
          </div>

          <div className="text-center space-y-4" data-testid="feature-certificates">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Vazifa va Testlar</h3>
            <p className="text-muted-foreground">
              Bilimingizni tekshiring va rivojlantiring
            </p>
          </div>

          <div className="text-center space-y-4" data-testid="feature-videos">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Sifatli Videolar</h3>
            <p className="text-muted-foreground">
              HD sifatli video darslar
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 space-y-6">
          <h2 className="text-3xl font-bold">O'z bilimingizni oshirishga tayyor misiz?</h2>
          <p className="text-xl text-muted-foreground">
            Hoziroq ro'yxatdan o'ting va minglab video kurslardan foydalaning
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-cta-signup"
          >
            Ro'yxatdan o'tish
          </Button>
        </div>
      </div>
    </div>
  );
}
