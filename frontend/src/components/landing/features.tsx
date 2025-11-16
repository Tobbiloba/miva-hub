import React from 'react'
import Image from 'next/image'
import { Sparkles, BookOpen, GraduationCap, Zap, MessageSquare, TrendingUp } from 'lucide-react'

const Features = () => {
  return (
    <div className='container mx-auto my-16 sm:my-24 md:my-32 px-4 sm:px-6' id='features'>
      <h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal max-w-2xl'>Meet Askly — built for effortless studying</h1>
      <p className='text-base sm:text-lg text-neutral-500 py-3'>
        Chat with citations, generate study guides from lectures, create quizzes in seconds, and track mastery — Askly brings your study workflow into one focused place.
      </p>
      
      {/* Bento Grid */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 sm:mt-12 md:mt-16 max-w-8xl mx-auto'>
        {/* Item 1 - Large featured card with background image */}
        <div className='relative rounded min-h-[500px] md:min-h-[600px] flex items-end col-span-1 md:col-span-2 overflow-hidden bg-neutral-900'>
          <Image
            src="/bento/chat-interface.png"
            alt="AI Chat Interface"
            fill
            className="object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative z-10 p-4 sm:p-6 md:p-8 text-white max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-medium mb-3 sm:mb-4 border border-white/20">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Askly Chat</span>
            </div>
            <h3 className='text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3'>Ask questions. Get cited answers.</h3>
            <p className='text-sm sm:text-base text-white/90'>Chat with Askly about lectures, assignments, or concepts — with sources you can trust.</p>
          </div>
        </div>

        {/* Items 2 & 3 - Middle column stacked */}
        <div className='flex flex-col gap-4 md:col-span-2'>
          {/* Course Materials Card */}
          <div className='relative rounded min-h-[290px] overflow-hidden bg-neutral-900'>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            >
              <source src="https://cdn.dribbble.com/userupload/4209026/file/original-f922daf78a5b62782c2ae7e165945f0f.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40" />
            <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-sm rounded flex items-center justify-center mb-2 sm:mb-3 border border-white/20">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className='text-lg sm:text-xl font-bold mb-1 sm:mb-1.5 text-white'>Course Materials</h3>
              <p className='text-white/80 text-xs sm:text-sm'>Import slides, notes, and readings — Askly organizes them and answers with sources.</p>
            </div>
          </div>

          {/* Analytics Preview Card */}
          <div className='relative rounded p-4 sm:p-6 min-h-[250px] sm:min-h-[290px] bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 flex flex-col justify-between overflow-hidden'>
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-sm rounded flex items-center justify-center mb-3 sm:mb-4 border border-white/20">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className='text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 text-white'>Track your learning</h3>
              <p className='text-neutral-400 text-xs sm:text-sm'>See study time, quiz performance, and mastery progress at a glance.</p>
            </div>
            <div className="relative w-full h-32 mt-4 rounded overflow-hidden bg-neutral-950/50 border border-neutral-800">
              <Image
                src="/bento/analytics-dashboard.png"
                alt="Analytics Dashboard"
                fill
                className="object-cover opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Item 4 - Personalized Learning */}
        <div className='md:col-span-1 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded p-6 sm:p-8 min-h-[220px] sm:min-h-[250px] border border-neutral-700 flex flex-col justify-center relative overflow-hidden'>
          <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-48 sm:h-48 bg-white/5 rounded blur-3xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded flex items-center justify-center mb-3 sm:mb-4 border border-white/20">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h3 className='text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 text-white'>Personalized Learning</h3>
            <p className='text-neutral-400 text-xs sm:text-sm'>Adaptive suggestions tailor practice to your weak spots and pace.</p>
          </div>
        </div>

        {/* Item 5 - Quick stats with video */}
        <div className='md:col-span-3 relative rounded min-h-[250px] overflow-hidden bg-neutral-900'>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          >
            <source src="https://cdn.dribbble.com/userupload/17865107/file/original-9f8b53156579274b19ba602ecbf8a949.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
          <div className="relative z-10 h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 text-center text-white max-w-4xl w-full">
              <div className="space-y-2">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">24/7</div>
                <div className="text-xs sm:text-sm text-neutral-400 font-medium">Always available</div>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-white/10 rounded flex items-center justify-center border border-white/20">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-400 font-medium">Instant responses</div>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-white/10 rounded flex items-center justify-center border border-white/20">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-400 font-medium">Smart conversations</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Features