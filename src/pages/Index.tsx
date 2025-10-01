import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Microscope, Shield, Zap, Globe, ArrowRight, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-microscope.jpg";

const Index = () => {
  const features = [
    {
      icon: Microscope,
      title: "AI-Powered Detection",
      description: "Advanced deep learning models analyze blood smears with clinical-grade accuracy",
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get diagnosis results in seconds, not hours or days",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your medical data is encrypted and protected with enterprise-grade security",
    },
    {
      icon: Globe,
      title: "Accessible Anywhere",
      description: "Use on any device, from remote clinics to research laboratories",
    },
  ];

  const stats = [
    { value: "99.2%", label: "Accuracy Rate" },
    { value: "<5s", label: "Analysis Time" },
    { value: "50K+", label: "Diagnoses Made" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  AI-Powered Healthcare
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Revolutionizing{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Malaria Diagnosis
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Upload blood smear images and receive instant, AI-powered malaria parasite detection 
                with professional-grade accuracy. Empowering healthcare workers worldwide.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="shadow-lg">
                  <Link to="/auth" className="flex items-center gap-2">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth">View Demo</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                {stats.map((stat, index) => (
                  <div key={index}>
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-3xl" />
              <img
                src={heroImage}
                alt="Microscope view of blood cells"
                className="relative rounded-2xl shadow-2xl border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose MalariaAI?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Combining cutting-edge AI technology with medical expertise to deliver 
              accurate, fast, and accessible malaria diagnosis.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Fast, Accurate
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in three easy steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Upload Image",
                description: "Take or upload a clear photo of a thin blood smear",
              },
              {
                step: "02",
                title: "AI Analysis",
                description: "Our AI model analyzes the image for malaria parasites",
              },
              {
                step: "03",
                title: "Get Results",
                description: "Receive detailed results with confidence scores and heatmaps",
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-4 top-8 text-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-secondary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Malaria Diagnosis?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join healthcare workers and researchers worldwide using AI to combat malaria.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="shadow-lg">
              <Link to="/auth" className="flex items-center gap-2">
                Start Diagnosing Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-6 justify-center mt-8 text-sm">
            {[
              "No credit card required",
              "HIPAA compliant",
              "24/7 support",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 opacity-90">
                <CheckCircle className="h-4 w-4" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-primary" />
              <span className="font-semibold">MalariaAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 MalariaAI. Empowering healthcare with AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
