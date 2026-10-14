'use client'

import { HeroSection } from '@/components/sections/hero'
import { CoursesSection } from '@/components/sections/course'
import { AboutSection } from '@/components/sections/about'
import { FAQSection } from '@/components/sections/faq'
import { CTASection } from '@/components/sections/cta'
import { HowItWorksSection } from '@/components/sections/How-it-works'
import { StatsSection } from '@/components/sections/status-bar'
import { FeaturesSection } from '@/components/sections/features'


export default function HomePage() {

  return (
    <div className="flex flex-col min-h-screen bg-background">
         <HeroSection />
          <StatsSection />
          <CoursesSection />
          <AboutSection />
          <HowItWorksSection />
          <FeaturesSection />
          <FAQSection />
          <CTASection />
    </div>
  )
}