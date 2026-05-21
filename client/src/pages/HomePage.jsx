import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Globe,
  ArrowRight,
  Check,
  Menu,
  X,
  Link2,
  Sparkles,
  CheckCircle2,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SEO Optimization: Set descriptive title and meta elements
  useEffect(() => {
    document.title = "Almaniq — Modern Scheduling, Simplified";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content =
      "Almaniq is a state-of-the-art scheduling platform designed to streamline meetings. Create custom event types, share your booking link, and manage your availability flawlessly.";
  }, []);

  // Smooth scroll handler
  const handleScrollTo = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Mock booking states for the interactive widget
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [interactiveStep, setInteractiveStep] = useState(1); // 1: Select Date, 2: Select Time, 3: Confirm, 4: Booked!

  // Grid dates for mini calendar mockup (May 2026 representation)
  // 1st of May is a Friday. So 5 empty spots, then 31 days.
  const emptyDays = Array(5).fill(null);
  const clickableDays = [11, 12, 13, 14, 15, 18, 19, 20, 21, 22]; // Available weekdays
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const mockTimeSlots = ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];

  const handleDateClick = (day) => {
    if (clickableDays.includes(day)) {
      setSelectedDate(day);
      setSelectedTime(null);
      setInteractiveStep(2);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setInteractiveStep(3);
  };

  const handleConfirmBooking = () => {
    setInteractiveStep(4);
    setBookingConfirmed(true);
  };

  const resetMockWidget = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingConfirmed(false);
    setInteractiveStep(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand selection:text-white transition-colors duration-300">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-md group-hover:scale-105 transition-transform duration-300">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Almaniq
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => handleScrollTo("features")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => handleScrollTo("how-it-works")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-300"
              aria-label={`Toggle theme`}
            >
              {theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
            </button>

            <Link
              to="/signin"
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="relative inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-all hover:bg-foreground/90 hover:shadow-lg hover:shadow-foreground/10 active:scale-95"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu & Theme Controls */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-background text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-background hover:bg-secondary"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-0 right-0 border-b border-border/60 bg-background px-4 py-6 shadow-xl flex flex-col gap-4 md:hidden"
            >
              <button
                onClick={() => handleScrollTo("features")}
                className="text-left py-2 text-base font-medium text-muted-foreground hover:text-foreground"
              >
                Features
              </button>
              <button
                onClick={() => handleScrollTo("how-it-works")}
                className="text-left py-2 text-base font-medium text-muted-foreground hover:text-foreground"
              >
                How It Works
              </button>
              <hr className="border-border/60" />
              <div className="flex items-center gap-4 pt-2">
                <Link
                  to="/signin"
                  className="flex-1 text-center py-2.5 rounded-xl border border-border/60 text-sm font-medium text-foreground hover:bg-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="flex-1 text-center py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Aesthetic background mesh glow effects */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/5" />
        <div className="absolute top-1/3 left-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/5" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
            
            {/* Hero Left Content */}
            <div className="flex flex-col text-center lg:text-left lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex self-center lg:self-start items-center gap-2 rounded-full border border-border/80 bg-secondary/80 px-3 py-1 text-xs font-semibold text-foreground/80 shadow-sm backdrop-blur-sm mb-6"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                <span>Next-Gen Scheduling is Here</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
              >
                Your scheduling,{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  simplified
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Create event types, share a booking link, and let people book time with you — without the back-and-forth email chains.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <Link
                  to="/signup"
                  className="flex h-12 w-full sm:w-auto items-center justify-center rounded-xl bg-foreground px-8 font-medium text-background transition-all hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg active:scale-95"
                >
                  Get Started Free
                </Link>
                <button
                  onClick={() => handleScrollTo("features")}
                  className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-secondary px-8 font-medium text-foreground transition-all hover:scale-[1.02] active:scale-95"
                >
                  See How It Works
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </div>

            {/* Hero Right: Pure HTML/CSS Premium Live Scheduling Interactive Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="w-full max-w-[460px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl transition-all duration-300 hover:shadow-blue-500/5 hover:border-border/80"
              >
                {/* Mockup Header */}
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full bg-red-500/70" />
                    <span className="h-3.5 w-3.5 rounded-full bg-yellow-500/70" />
                    <span className="h-3.5 w-3.5 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
                    almaniq.live/alex
                  </span>
                  <div className="w-10 h-3" /> {/* Spacer */}
                </div>

                <div className="flex flex-col md:flex-row min-h-[380px]">
                  
                  {/* Left Column: Event details */}
                  <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-border/60 p-6 flex flex-col justify-between bg-muted/10">
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 font-semibold text-sm">
                        AD
                      </div>
                      <h3 className="text-xs font-medium text-muted-foreground">Alex Dev</h3>
                      <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                        15 Min Discovery Call
                      </h2>
                      
                      <div className="mt-4 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Clock className="h-4.5 w-4.5 text-muted-foreground/80" />
                          <span>15 min</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Video className="h-4.5 w-4.5 text-muted-foreground/80" />
                          <span>Google Meet (Video)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Globe className="h-4.5 w-4.5 text-muted-foreground/80" />
                          <span>Asia/Kolkata (IST)</span>
                        </div>
                      </div>
                    </div>

                    {/* Reset State Button */}
                    {interactiveStep > 1 && (
                      <button
                        onClick={resetMockWidget}
                        className="mt-6 text-left text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        ← Start Over
                      </button>
                    )}
                  </div>

                  {/* Right Column: Dynamic Scheduler Interface */}
                  <div className="w-full md:w-3/5 p-6 flex flex-col justify-between">
                    
                    {/* Step 1: Select Date */}
                    {interactiveStep === 1 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-foreground">Select a Date</h4>
                          <span className="text-xs font-semibold text-muted-foreground">May 2026</span>
                        </div>
                        
                        {/* Mini Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                          {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
                            <div key={index} className="py-1 font-semibold text-muted-foreground/60">{d}</div>
                          ))}
                          
                          {/* Fill empty slots */}
                          {emptyDays.map((_, i) => (
                            <div key={`empty-${i}`} className="py-2" />
                          ))}

                          {/* Days */}
                          {daysInMonth.map((day) => {
                            const isClickable = clickableDays.includes(day);
                            return (
                              <button
                                key={`day-${day}`}
                                onClick={() => handleDateClick(day)}
                                disabled={!isClickable}
                                className={`py-2 rounded-lg font-medium transition-all ${
                                  isClickable
                                    ? "bg-blue-50/50 hover:bg-blue-600 hover:text-white dark:bg-blue-900/10 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 cursor-pointer font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                                    : "text-muted-foreground/30 pointer-events-none"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-4 text-[10px] text-muted-foreground text-center">
                          💡 Click any active date to see slots
                        </p>
                      </div>
                    )}

                    {/* Step 2: Select Time */}
                    {interactiveStep === 2 && (
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-4">
                          May {selectedDate}, 2026
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">Select an available time slot:</p>
                        
                        <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                          {mockTimeSlots.map((time, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleTimeSelect(time)}
                              className="w-full py-2.5 rounded-xl border border-border bg-background hover:border-blue-500 hover:bg-blue-500/5 text-sm font-medium text-foreground text-center transition-all active:scale-[0.98]"
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Confirm Details */}
                    {interactiveStep === 3 && (
                      <div className="flex flex-col h-full justify-between py-2">
                        <div>
                          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/10 p-4 border border-blue-100/40 dark:border-blue-900/30">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                              Selected Slot
                            </span>
                            <span className="text-base font-bold text-foreground block">
                              May {selectedDate}, 2026 at {selectedTime}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1.5 block">
                              Please review and confirm to book.
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">Your Name</label>
                            <input
                              type="text"
                              disabled
                              value="Demo Guest"
                              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleConfirmBooking}
                          className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                        >
                          Confirm & Book
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 4: Booked Success Screen */}
                    {interactiveStep === 4 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center py-6 h-full"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 mb-4 animate-bounce">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h4 className="text-base font-bold text-foreground">Booking Confirmed!</h4>
                        <p className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                          Meeting scheduled on <strong>May {selectedDate}, 2026</strong> at <strong>{selectedTime}</strong>
                        </p>
                        
                        <button
                          onClick={resetMockWidget}
                          className="mt-6 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Reset Demo
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 sm:py-28 bg-secondary/30 relative border-y border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
              Robust Feature Set
            </h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Powering meetings without the pain
            </p>
            <p className="mt-4 text-muted-foreground text-base max-w-xl mx-auto">
              Everything you need to automate scheduling so you can focus on what actually matters.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* Card 1: Create Event Types */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col justify-between p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-border/80 transition-all duration-300"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 mb-6 border border-blue-100/50 dark:border-blue-950/30">
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Create Event Types</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Set up 15min, 30min, or custom meetings. Support flexible session formats, durations, and booking slots tailored perfectly to your schedule.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                <span>Learn more</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </motion.div>

            {/* Card 2: Share Your Link */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col justify-between p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-border/80 transition-all duration-300"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 mb-6 border border-indigo-100/50 dark:border-indigo-950/30">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Share Your Link</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  One simple booking link, and anyone can book directly into your calendar. Send it via email, SMS, or embed it natively into your website.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                <span>Learn more</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </motion.div>

            {/* Card 3: Manage Everything */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col justify-between p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-border/80 transition-all duration-300"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 mb-6 border border-emerald-100/50 dark:border-emerald-950/30">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Manage Everything</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Centralized dashboard to track scheduled bookings, configure availability hours, and activate break mode to pause bookings instantly.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
                <span>Learn more</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
            <h2 className="text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
              Get Started in Minutes
            </h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Simplifying the scheduling flow
            </p>
            <p className="mt-4 text-muted-foreground text-base max-w-xl mx-auto">
              Follow these simple steps to configure your booking experience and reclaim your focus time.
            </p>
          </div>

          {/* Stepper Steps grid */}
          <div className="relative">
            {/* Elegant SVG connector line for large screens */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 -translate-y-1/2 -z-10" />
            
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-base shadow-lg shadow-blue-500/20">
                  1
                </div>
                <h3 className="mt-6 text-base font-bold text-foreground">Create an event type</h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                  Configure meeting length, location details, and link configurations.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-base shadow-lg shadow-indigo-500/20">
                  2
                </div>
                <h3 className="mt-6 text-base font-bold text-foreground">Set your availability</h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                  Specify times you are available and configure custom buffer intervals.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-base shadow-lg shadow-purple-500/20">
                  3
                </div>
                <h3 className="mt-6 text-base font-bold text-foreground">Share your booking link</h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                  Provide your personalized link to let invitees pick open time blocks.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/20">
                  4
                </div>
                <h3 className="mt-6 text-base font-bold text-foreground">Confirm and manage</h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                  Accept bookings and view notifications in your central dashboard.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="bg-secondary/40 border-t border-border/50 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to streamline your scheduling?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Join thousands of professionals booking meetings seamlessly and reclaiming their focus.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/signup"
              className="flex h-12 items-center justify-center rounded-xl bg-foreground hover:bg-foreground/90 text-background px-8 font-medium transition-all hover:scale-[1.02] shadow-md"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <span className="text-base font-bold text-foreground">Almaniq</span>
          </div>
          <p className="text-xs text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} Almaniq. All rights reserved. Your scheduling, simplified.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/signin" className="hover:text-foreground">Sign In</Link>
            <Link to="/signup" className="hover:text-foreground">Sign Up</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
