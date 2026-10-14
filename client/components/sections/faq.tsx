'use client'
import { AddCircleIcon, ChatDotsIcon, MinusCircleIcon, MinusSquareIcon } from '@solar-icons/react/outline';


import React, { useState, useRef } from 'react'
import { useFadeUpReveal, useStaggerReveal } from '@/lib/use-gsap-scroll'
import { WHATSAPP_SUPPORT_URL } from '@/lib/whatsapp'


const faqItems = [
  {
    question: 'كيف يمكنني تسجيل ابني أو ابنتي في المدرسة؟',
    answer: 'يمكنك التواصل معنا مباشرة عبر واتساب بالضغط على أي من أزرار التسجيل في المنصة، وسيقوم فريقنا بإنشاء الحساب وتزويدكم ببيانات الدخول الخاصة بالطالب فوراً.',
  },
  {
    question: 'هل المنهج الذي تُدرّسونه هو المنهج السوداني الرسمي؟',
    answer: 'نعم، نلتزم بالمنهج السوداني المعتمد في جميع مراحل الأساس والمتوسط والثانوي، بما يتوافق مع النظام الدراسي المعمول به في السودان.',
  },
  {
    question: 'كيف تتم عملية الاشتراك في المقررات والدفع؟',
    answer: 'بعد اختيار المقرر، تقومون بتحويل رسوم الاشتراك عبر البنك وإدخال رقم الحوالة. يتم تفعيل الحساب فور تأكيد الإدارة لعملية الدفع.',
  },
  {
    question: 'هل يمكن مشاهدة الدروس من الهاتف؟',
    answer: 'بالتأكيد، جميع الدروس تعمل بسلاسة على الهاتف والتابلت والكمبيوتر، ويمكن للطالب متابعة دروسه من أي جهاز متاح في المنزل.',
  },
  {
    question: 'هل توجد دروس مجانية يمكن تجربتها قبل الاشتراك؟',
    answer: 'نعم، أتحنا بعض الدروس مجاناً كعينة من أسلوب الشرح وجودة المحتوى، ليطمئن الطالب وأسرته قبل اتخاذ قرار الاشتراك.',
  },
]

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useFadeUpReveal(headerRef, { yFrom: 28, duration: 0.8 })
  useStaggerReveal(gridRef, { stagger: 0.1, yFrom: 24, duration: 0.7 })

  const toggle = (index: number) => setOpenIndex(openIndex === index ? null : index)

  return (
    <section id="faq" className="py-24 sm:py-36 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">

        <div ref={headerRef} className="max-w-2xl mb-14 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-pastel-yellow text-pastel-yellow-fg px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            أسئلة شائعة
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            كل ما يخطر ببالكم
          </h2>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Large accordion tile */}
          <div className="lg:col-span-2 rounded-[2rem] bg-muted p-3 sm:p-4">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index
              return (
                <div key={index} className={`px-5 sm:px-6 ${index !== faqItems.length - 1 ? 'border-b border-border' : ''}`}>
                  <button
                    onClick={() => toggle(index)}
                    className="w-full flex items-center justify-between gap-4 py-6 text-right cursor-pointer"
                  >
                    <h3 className="text-base font-bold leading-relaxed text-foreground">
                      {item.question}
                    </h3>
                    <div className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full transition-colors ${isOpen ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'}`}>
                      {isOpen ? <MinusSquareIcon className="h-3.5 w-3.5" /> : <AddCircleIcon className="h-3.5 w-3.5" />}
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="pb-6 text-sm text-muted-foreground font-medium leading-relaxed max-w-xl">
                      {item.answer}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Colorful "still have questions" CTA tile */}
          <div className="relative overflow-hidden rounded-[2rem] bg-pastel-green text-pastel-green-fg p-8 sm:p-9 flex flex-col justify-between min-h-[280px] lg:min-h-0">
            <div className="relative z-10 space-y-2.5">
              <h3 className="text-xl font-black leading-tight">لسه عندك سؤال؟</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                فريقنا جاهز للرد على أي استفسار عبر واتساب في أي وقت.
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-gradient-to-br from-white/60 to-transparent blur-xl" />

            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex items-center gap-2.5 h-12 px-6 rounded-full bg-foreground text-background font-bold text-sm w-fit"
            >
              <ChatDotsIcon className="h-4.5 w-4.5"  />
              تواصل معنا
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}