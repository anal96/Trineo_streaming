import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import trineoLogoImg from '@/images/trineoStream-1.png';

// ─── Studiova Landing Page ─────────────────────────────────────────────────────
// Renders the approved Studiova HTML template natively inside React.
// All navigation links are intercepted and routed through React Router.
// jQuery, Bootstrap, Owl Carousel, AOS, and Iconify are loaded dynamically.
// CSS is scoped via the .studiova-scope wrapper to prevent leakage.
// ────────────────────────────────────────────────────────────────────────────────

const ASSET_BASE = '/studiova-assets';

const LANDING_HTML = `
  <!-- Header -->
  <header class="header border-4 border-primary border-top border-bottom-0 border-start-0 border-end-0 position-fixed start-0 top-0 w-100">
    <div class="container">
      <div class="header-wrapper d-flex align-items-center justify-content-between">
        <div class="logo">
          <a href="/" class="logo-white text-decoration-none d-flex align-items-center gap-2">
            <img src="${trineoLogoImg}" alt="Trineo Logo" width="30" height="30" class="img-fluid rounded-circle" style="object-fit: contain;">
            <span class="text-logo mb-0 fw-bold text-white">Trineo Stream</span>
          </a>
          <a href="/" class="logo-dark text-decoration-none d-flex align-items-center gap-2">
            <img src="${trineoLogoImg}" alt="Trineo Logo" width="30" height="30" class="img-fluid rounded-circle" style="object-fit: contain;">
            <span class="text-logo mb-0 fw-bold text-dark">Trineo Stream</span>
          </a>
        </div>
        <div class="d-flex align-items-center gap-4">
          <div class="btn-group">
            <button
              class="btn btn-secondary toggle-menu round-45 p-2 d-flex align-items-center justify-content-center bg-white rounded-circle"
              type="button" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false">
              <iconify-icon icon="solar:hamburger-menu-line-duotone" class="menu-icon fs-8 text-dark"></iconify-icon>
            </button>
            <ul class="dropdown-menu dropdown-menu-end p-4">
              <div class="d-flex flex-column gap-6">
                <div class="hstack justify-content-between border-bottom pb-6">
                  <p class="mb-0 fs-5 text-dark">Menu</p>
                  <button type="button" class="btn-close opacity-75" aria-label="Close"></button>
                </div>
                <div class="d-flex flex-column gap-3">
                  <ul class="header-menu list-unstyled mb-0 d-flex flex-column gap-2">
                    <li class="header-item">
                      <a href="/" aria-current="true"
                        class="header-link active hstack gap-2 fs-7 fw-bold text-dark"><img
                          src="${ASSET_BASE}/images/svgs/secondary-leaf.svg" alt="" width="20" height="20"
                          class="img-fluid animate-spin">Home</a>
                    </li>
                    <li class="header-item">
                      <a href="#services" class="header-link hstack gap-2 fs-7 fw-bold text-dark"><img
                          src="${ASSET_BASE}/images/svgs/secondary-leaf.svg" alt="" width="20" height="20"
                          class="img-fluid animate-spin">Services</a>
                    </li>
                    <li class="header-item">
                      <a href="#" class="header-link hstack gap-2 fs-7 fw-bold text-dark"><img
                          src="${ASSET_BASE}/images/svgs/secondary-leaf.svg" alt="" width="20" height="20"
                          class="img-fluid animate-spin">About</a>
                    </li>
                    <li class="header-item">
                      <a href="#" class="header-link hstack gap-2 fs-7 fw-bold text-dark"><img
                          src="${ASSET_BASE}/images/svgs/secondary-leaf.svg" alt="" width="20" height="20"
                          class="img-fluid animate-spin">Contact</a>
                    </li>
                  </ul>
                  <div class="hstack gap-3">
                    <a href="/login"
                      class="btn btn-outline-light fs-6 bg-white px-3 py-2 text-dark w-50 hstack justify-content-center" data-nav="login">Sign
                      In</a>
                    <a href="/signup"
                      class="btn btn-dark text-white fs-6 bg-dark px-3 py-2 w-50 hstack justify-content-center" data-nav="signup">Sign
                      Up</a>
                  </div>
                </div>
                <div>
                  <a class="text-dark" href="tel:+1-212-456-7890">+1-212-456-7890</a>
                  <a class="fs-8 text-dark fw-bold" href="mailto:info@trineostream.com">info@trineostream.com</a>
                </div>
              </div>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!--  Page Wrapper -->
  <div class="page-wrapper overflow-hidden">

    <!--  Banner Section -->
    <section class="banner-section position-relative d-flex align-items-end min-vh-100">
      <video class="position-absolute top-0 start-0 w-100 h-100 object-fit-cover" autoplay muted loop playsinline>
        <source src="${ASSET_BASE}/images/backgrounds/banner-video.mp4" type="video/mp4" />
      </video>
      <div class="container">
        <div class="d-flex flex-column gap-4 pb-8 position-relative z-1">
          <div class="row align-items-center">
            <div class="col-xl-4">
                <div class="d-flex align-items-center gap-4" data-aos="fade-up" data-aos-delay="100"
                data-aos-duration="1000">
                <img src="${ASSET_BASE}/images/svgs/primary-leaf.svg" alt="" class="img-fluid animate-spin">
                <p class="mb-0 text-white fs-5 text-opacity-70">Trusted by modern academies, educators, and training organizations. <span
                    class="text-primary">Trineo Stream</span> helps institutes build premium OTT-style learning platforms
                  with secure video streaming, student management, and analytics</p>
              </div>
            </div>
          </div>
            <div class="d-flex align-items-end gap-3" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
            <h1 class="mb-0 fs-16 text-white lh-1">Trineo Stream</h1>
            <a href="/signup" class="p-1 ps-7 bg-primary rounded-pill" data-nav="signup">
              <span class="bg-white round-52 rounded-circle d-flex align-items-center justify-content-center">
                <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!--  Stats & Facts Section -->
    <section class="stats-facts py-5 py-lg-11 py-xl-12 position-relative overflow-hidden">
      <div class="container">
        <div class="row gap-7 gap-xl-0">
          <div class="col-xl-4 col-xxl-4">
            <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
              data-aos-duration="1000">
              <span
                class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">01</span>
              <hr class="border-line">
              <span class="badge text-bg-dark">Platform</span>
            </div>
          </div>
          <div class="col-xl-8 col-xxl-7">
            <div class="d-flex flex-column gap-9">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100"
                    data-aos-duration="1000">
                    <h2 class="mb-0">Everything You Need To Run A Modern Learning Platform</h2>
                    <p class="fs-5 mb-0">From secure video delivery to student engagement and analytics, Trineo Stream provides all the tools required to launch and scale your digital academy.</p>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6 col-lg-4 mb-7 mb-lg-0">
                    <div class="d-flex flex-column gap-6 pt-9 border-top" data-aos="fade-up" data-aos-delay="200"
                    data-aos-duration="1000">
                    <h2 class="mb-0 fs-14">10,000+</h2>
                    <p class="mb-0">Learning Hours Delivered</p>
                  </div>
                </div>
                <div class="col-md-6 col-lg-4 mb-7 mb-lg-0">
                  <div class="d-flex flex-column gap-6 pt-9 border-top" data-aos="fade-up" data-aos-delay="300"
                    data-aos-duration="1000">
                    <h2 class="mb-0 fs-14">50,000+</h2>
                    <p class="mb-0">Student Sessions</p>
                  </div>
                </div>
                <div class="col-md-6 col-lg-4 mb-7 mb-lg-0">
                  <div class="d-flex flex-column gap-6 pt-9 border-top" data-aos="fade-up" data-aos-delay="400"
                    data-aos-duration="1000">
                    <h2 class="mb-0 fs-14">99.9%</h2>
                    <p class="mb-0">Platform Availability</p>
                  </div>
                </div>
              </div>
              <a href="/signup" class="btn" data-aos="fade-up" data-aos-delay="500" data-aos-duration="1000" data-nav="signup">
                <span class="btn-text">Start Building</span>
                <iconify-icon icon="lucide:arrow-up-right"
                  class="btn-icon bg-white text-dark round-52 rounded-circle hstack justify-content-center fs-7 shadow-sm"></iconify-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="position-absolute bottom-0 start-0" data-aos="zoom-in" data-aos-delay="100" data-aos-duration="1000">
        <img src="${ASSET_BASE}/images/backgrounds/stats-facts-bg.svg" alt="" class="img-fluid">
      </div>
    </section>

    <!--  Featured Projects Section -->
    <section class="featured-projects py-5 py-lg-11 py-xl-12 bg-light-gray">
      <div class="d-flex flex-column gap-5 gap-xl-11">
        <div class="container">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                data-aos-duration="1000">
                <span
                  class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">02</span>
                <hr class="border-line">
                <span class="badge text-bg-dark">Features</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100"
                    data-aos-duration="1000">
                    <h2 class="mb-0">Everything You Need To Run A Modern Learning Platform</h2>
                    <p class="fs-5 mb-0">From secure video delivery to student engagement and analytics, Trineo Stream provides all the tools required to launch and scale your digital academy.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="featured-projects-slider px-3">
          <div class="owl-carousel owl-theme">
            <div class="item">
              <div class="portfolio d-flex flex-column gap-6">
                <div class="portfolio-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/portfolio/portfolio-img-1.jpg" alt="" class="img-fluid">
                  <div class="portfolio-overlay">
                    <a href="/signup"
                      class="position-absolute top-50 start-50 translate-middle bg-primary round-64 rounded-circle hstack justify-content-center" data-nav="signup">
                      <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
                    </a>
                  </div>
                </div>
                <div class="portfolio-details d-flex flex-column gap-3">
                  <h3 class="mb-0">Premium Video Streaming</h3>
                  <div class="hstack gap-2">
                    <span class="badge text-dark border">OTT-Style</span>
                    <span class="badge text-dark border">Live & Prerecorded</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="item">
              <div class="portfolio d-flex flex-column gap-6">
                <div class="portfolio-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/portfolio/portfolio-img-2.jpg" alt="" class="img-fluid">
                  <div class="portfolio-overlay">
                    <a href="/signup"
                      class="position-absolute top-50 start-50 translate-middle bg-primary round-64 rounded-circle hstack justify-content-center" data-nav="signup">
                      <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
                    </a>
                  </div>
                </div>
                <div class="portfolio-details d-flex flex-column gap-3">
                  <h3 class="mb-0">Learning Management System</h3>
                  <div class="hstack gap-2">
                    <span class="badge text-dark border">Courses</span>
                    <span class="badge text-dark border">Assessments</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="item">
              <div class="portfolio d-flex flex-column gap-6">
                <div class="portfolio-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/portfolio/portfolio-img-3.jpg" alt="" class="img-fluid">
                  <div class="portfolio-overlay">
                    <a href="/signup"
                      class="position-absolute top-50 start-50 translate-middle bg-primary round-64 rounded-circle hstack justify-content-center" data-nav="signup">
                      <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
                    </a>
                  </div>
                </div>
                <div class="portfolio-details d-flex flex-column gap-3">
                  <h3 class="mb-0">Institute Management</h3>
                  <div class="hstack gap-2">
                    <span class="badge text-dark border">Admissions</span>
                    <span class="badge text-dark border">Operations</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="item">
              <div class="portfolio d-flex flex-column gap-6">
                <div class="portfolio-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/portfolio/portfolio-img-4.jpg" alt="" class="img-fluid">
                  <div class="portfolio-overlay">
                    <a href="/signup"
                      class="position-absolute top-50 start-50 translate-middle bg-primary round-64 rounded-circle hstack justify-content-center" data-nav="signup">
                      <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
                    </a>
                  </div>
                </div>
                <div class="portfolio-details d-flex flex-column gap-3">
                  <h3 class="mb-0">Advanced Analytics</h3>
                  <div class="hstack gap-2">
                    <span class="badge text-dark border">Engagement</span>
                    <span class="badge text-dark border">Real Time</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="item">
              <div class="portfolio d-flex flex-column gap-6">
                <div class="portfolio-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/portfolio/portfolio-img-5.jpg" alt="" class="img-fluid">
                  <div class="portfolio-overlay">
                    <a href="/signup"
                      class="position-absolute top-50 start-50 translate-middle bg-primary round-64 rounded-circle hstack justify-content-center" data-nav="signup">
                      <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
                    </a>
                  </div>
                </div>
                <div class="portfolio-details d-flex flex-column gap-3">
                  <h3 class="mb-0">Enterprise Security</h3>
                  <div class="hstack gap-2">
                    <span class="badge text-dark border">Watermarking</span>
                    <span class="badge text-dark border">Access Controls</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="item">
              <div class="portfolio d-flex flex-column gap-6">
                <div class="portfolio-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/portfolio/portfolio-img-6.jpg" alt="" class="img-fluid">
                  <div class="portfolio-overlay">
                    <a href="/signup"
                      class="position-absolute top-50 start-50 translate-middle bg-primary round-64 rounded-circle hstack justify-content-center" data-nav="signup">
                      <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-dark"></iconify-icon>
                    </a>
                  </div>
                </div>
                <div class="portfolio-details d-flex flex-column gap-3">
                  <h3 class="mb-0">White Label Experience</h3>
                  <div class="hstack gap-2">
                    <span class="badge text-dark border">Custom Domains</span>
                    <span class="badge text-dark border">Branding</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Services Section -->
    <section class="services py-5 py-lg-11 py-xl-12 bg-dark" id="services">
      <div class="container">
          <div class="d-flex flex-column gap-5 gap-xl-10">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                data-aos-duration="1000">
                <span
                  class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">03</span>
                <hr class="border-line bg-white">
                <span class="badge text-dark bg-white">Ecosystem</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100"
                    data-aos-duration="1000">
                    <h2 class="mb-0 text-white">Powered By The Trineo Ecosystem</h2>
                    <p class="fs-5 mb-0 text-white text-opacity-70">A connected suite of products designed to help organizations build, manage, and grow digital learning businesses.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="services-tab">
            <div class="row gap-5 gap-xl-0">
              <div class="col-xl-4">
                <div class="tab-content" data-aos="zoom-in" data-aos-delay="100" data-aos-duration="1000">
                  <div class="tab-pane active" id="one" role="tabpanel" aria-labelledby="one-tab" tabindex="0">
                    <img src="${ASSET_BASE}/images/services/services-img-1.jpg" alt="services" class="img-fluid">
                  </div>
                  <div class="tab-pane" id="two" role="tabpanel" aria-labelledby="two-tab" tabindex="0">
                    <img src="${ASSET_BASE}/images/services/services-img-2.jpg" alt="services" class="img-fluid">
                  </div>
                  <div class="tab-pane" id="three" role="tabpanel" aria-labelledby="three-tab" tabindex="0">
                    <img src="${ASSET_BASE}/images/services/services-img-3.jpg" alt="services" class="img-fluid">
                  </div>
                  <div class="tab-pane" id="four" role="tabpanel" aria-labelledby="four-tab" tabindex="0">
                    <img src="${ASSET_BASE}/images/services/services-img-4.jpg" alt="services" class="img-fluid">
                  </div>
                </div>
              </div>
              <div class="col-xl-8">
                <div class="d-flex flex-column gap-5">
                  <ul class="nav nav-tabs" id="myTab" role="tablist" data-aos="fade-up" data-aos-delay="200"
                    data-aos-duration="1000">
                    <li
                      class="nav-item py-4 py-lg-8 border-top border-white border-opacity-10 d-flex align-items-center w-100"
                      role="presentation">
                      <div class="row w-100 align-items-center gx-3">
                        <div class="col-lg-6 col-xxl-5">
                          <button class="nav-link fs-10 fw-bold py-1 px-0 border-0 rounded-0 flex-shrink-0 active"
                            id="one-tab" data-bs-toggle="tab" data-bs-target="#one" type="button" role="tab"
                            aria-controls="one" aria-selected="true">Trineo Stream</button>
                        </div>
                        <div class="col-lg-6 col-xxl-7">
                          <p class="text-white text-opacity-70 mb-0">
                            Premium video streaming infrastructure for modern learning platforms.
                          </p>
                        </div>
                      </div>
                    </li>
                    <li
                      class="nav-item py-4 py-lg-8 border-top border-white border-opacity-10 d-flex align-items-center w-100"
                      role="presentation">
                      <div class="row w-100 align-items-center gx-3">
                        <div class="col-lg-6 col-xxl-5">
                          <button class="nav-link fs-10 fw-bold py-1 px-0 border-0 rounded-0 flex-shrink-0" id="two-tab"
                            data-bs-toggle="tab" data-bs-target="#two" type="button" role="tab" aria-controls="two"
                            aria-selected="false">Trineo Learn</button>
                        </div>
                        <div class="col-lg-6 col-xxl-7">
                          <p class="text-white text-opacity-70 mb-0">
                            Learning management and student engagement tools for institutes and educators.
                          </p>
                        </div>
                      </div>
                    </li>
                    <li
                      class="nav-item py-4 py-lg-8 border-top border-white border-opacity-10 d-flex align-items-center w-100"
                      role="presentation">
                      <div class="row w-100 align-items-center gx-3">
                        <div class="col-lg-6 col-xxl-5">
                          <button class="nav-link fs-10 fw-bold py-1 px-0 border-0 rounded-0 flex-shrink-0"
                            id="three-tab" data-bs-toggle="tab" data-bs-target="#three" type="button" role="tab"
                            aria-controls="three" aria-selected="false">Trineo Workspace</button>
                        </div>
                        <div class="col-lg-6 col-xxl-7">
                          <p class="text-white text-opacity-70 mb-0">
                            Institute operations and administration platform for managing your organization.
                          </p>
                        </div>
                      </div>
                    </li>
                    <li
                      class="nav-item py-4 py-lg-8 border-top border-white border-opacity-10 d-flex align-items-center w-100"
                      role="presentation">
                      <div class="row w-100 align-items-center gx-3">
                        <div class="col-lg-6 col-xxl-5">
                          <button class="nav-link fs-10 fw-bold py-1 px-0 border-0 rounded-0 flex-shrink-0"
                            id="four-tab" data-bs-toggle="tab" data-bs-target="#four" type="button" role="tab"
                            aria-controls="four" aria-selected="false">Trineo Analytics</button>
                        </div>
                        <div class="col-lg-6 col-xxl-7">
                          <p class="text-white text-opacity-70 mb-0">
                            Performance reporting and business intelligence for data-driven decisions.
                          </p>
                        </div>
                      </div>
                    </li>
                  </ul>
                  <a href="/signup" class="btn border border-white border-opacity-25" data-aos="fade-up"
                    data-aos-delay="300" data-aos-duration="1000" data-nav="signup">
                    <span class="btn-text">Book a Demo</span>
                    <iconify-icon icon="lucide:arrow-up-right"
                      class="btn-icon bg-white text-dark round-52 rounded-circle hstack justify-content-center fs-7 shadow-sm"></iconify-icon>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Why choose us Section -->
    <section class="why-choose-us py-5 py-lg-11 py-xl-12">
      <div class="container">
        <div class="row justify-content-between gap-5 gap-xl-0">
          <div class="col-xl-3 col-xxl-3">
            <div class="d-flex flex-column gap-7">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                data-aos-duration="1000">
                <span
                  class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">04</span>
                <hr class="border-line">
                <span class="badge text-bg-dark">Built For</span>
              </div>
              <h2 class="mb-0" data-aos="fade-right" data-aos-delay="200" data-aos-duration="1000">Built For Modern Education</h2>
              <p class="mb-0 fs-5" data-aos="fade-right" data-aos-delay="300" data-aos-duration="1000">Trineo Stream is built for teams that need confidence, scale, and polished delivery across every learning experience.</p>
            </div>
          </div>
          <div class="col-xl-9 col-xxl-8">
            <div class="row">
              <div class="col-lg-4 mb-7 mb-lg-0">
                <div class="card position-relative overflow-hidden bg-primary h-100" data-aos="fade-up"
                  data-aos-delay="100" data-aos-duration="1000">
                  <div class="card-body d-flex flex-column justify-content-between">
                    <div class="d-flex flex-column gap-3 position-relative z-1">
                      <ul class="list-unstyled mb-0 hstack gap-1">
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-dark"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-dark"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-dark"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-dark"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-line-duotone"
                              class="fs-6 text-dark"></iconify-icon></a></li>
                      </ul>
                      <p class="mb-0 fs-6 text-dark">Stream lessons with confidence. Manage thousands of students effortlessly. Scale from a single classroom to a nationwide academy.</p>
                    </div>
                    <div class="position-relative z-1">
                      <div class="pb-6 border-bottom">
                        <h2 class="mb-0">99.9%</h2>
                        <p class="mb-0">Platform Availability</p>
                      </div>
                      <div class="hstack gap-6 pt-6">
                        <img src="${ASSET_BASE}/images/profile/avatar-1.png" alt=""
                          class="img-fluid rounded-circle overflow-hidden flex-shrink-0" width="64" height="64">
                        <div>
                          <h5 class="mb-0">Wade Warren</h5>
                          <p class="mb-0">Bank of America</p>
                        </div>
                      </div>
                    </div>
                    <div class="position-absolute bottom-0 end-0">
                      <img src="${ASSET_BASE}/images/backgrounds/customer-satisfaction-bg.svg" alt="" class="img-fluid">
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 mb-7 mb-lg-0">
                <div class="d-flex flex-column gap-7" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                  <div class="position-relative">
                    <img src="${ASSET_BASE}/images/services/services-img-2.jpg" alt="" class="img-fluid w-100">
                  </div>
                  <div class="card bg-dark">
                    <div class="card-body d-flex flex-column gap-7">
                      <div>
                        <h2 class="mb-0 text-white">50,000+</h2>
                          <p class="mb-0 text-white text-opacity-70">Student Sessions</p>
                      </div>
                      <ul class="d-flex align-items-center mb-0">
                        <li>
                          <a href="javascript:void(0)">
                            <img src="${ASSET_BASE}/images/profile/user-1.jpg" width="44" height="44"
                              class="rounded-circle border border-2 border-dark" alt="user-1">
                          </a>
                        </li>
                        <li class="ms-n2">
                          <a href="javascript:void(0)">
                            <img src="${ASSET_BASE}/images/profile/user-2.jpg" width="44" height="44"
                              class="rounded-circle border border-2 border-dark" alt="user-2">
                          </a>
                        </li>
                        <li class="ms-n2">
                          <a href="javascript:void(0)">
                            <img src="${ASSET_BASE}/images/profile/user-3.jpg" width="44" height="44"
                              class="rounded-circle border border-2 border-dark" alt="user-3">
                          </a>
                        </li>
                        <li class="ms-n2">
                          <a href="javascript:void(0)">
                            <img src="${ASSET_BASE}/images/profile/user-4.jpg" width="44" height="44"
                              class="rounded-circle border border-2 border-dark" alt="user-4">
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 mb-7 mb-lg-0">
                <div class="card border h-100 position-relative overflow-hidden" data-aos="fade-up" data-aos-delay="300"
                  data-aos-duration="1000">
                  <span
                    class="border rounded-circle round-490 d-block position-absolute top-0 start-50 translate-middle"></span>
                  <div class="card-body d-flex flex-column justify-content-between">
                    <div>
                      <h2 class="mb-0">100%</h2>
                      <p class="mb-0 text-dark">Cloud-Based Infrastructure</p>
                    </div>
                    <div class="d-flex flex-column gap-3">
                      <p class="mb-0 fs-5 text-dark">Gain actionable insights through analytics. Deliver premium learning experiences across devices.</p>
                    </div>
                  </div>
                  <span
                    class="border rounded-circle round-490 d-block position-absolute top-100 start-50 translate-middle"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Testimonial Section -->
    <section class="testimonial py-5 py-lg-11 py-xl-12 bg-light-gray">
      <div class="container">
        <div class="d-flex flex-column gap-5 gap-xl-11">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                data-aos-duration="1000">
                <span
                  class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">05</span>
                <hr class="border-line bg-white">
                <span class="badge text-bg-dark">Use Cases</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100"
                    data-aos-duration="1000">
                    <h2 class="mb-0">Built For Every Learning Business</h2>
                    <p class="fs-5 mb-0 text-opacity-70">Educational institutions and training organizations use Trineo Stream to deliver engaging learning experiences and grow their digital presence.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row gap-7 gap-lg-0">
            <div class="col-lg-4 col-xl-3 d-flex align-items-stretch">
              <div class="card bg-primary w-100" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
                <div class="card-body d-flex flex-column gap-5 gap-xl-11 justify-content-between">
                  <div class="d-flex flex-column gap-4">
                    <p class="mb-0">Coaching Institutes</p>
                    <h4 class="mb-0">Launch secure online cohorts and manage student learning journeys.</h4>
                  </div>
                  <div class="hstack gap-3">
                    <img src="${ASSET_BASE}/images/testimonial/testimonial-1.jpg" alt=""
                      class="img-fluid rounded-circle overflow-hidden flex-shrink-0" width="60" height="60">
                    <div>
                      <h5 class="mb-1 fw-normal">Professional Training</h5>
                      <p class="mb-0">Certifications & Workshops</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-4 col-xl-6 d-flex align-items-stretch">
              <div class="card bg-dark w-100" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                <div class="card-body d-flex flex-column gap-5 gap-xl-11 justify-content-between">
                  <div class="d-flex flex-column gap-4">
                    <p class="mb-0 text-white text-opacity-70">What our users say</p>
                    <h4 class="mb-0 text-white pe-xl-2">Trineo Stream gives us the enterprise-grade reliability, analytics, and polished experience we need to run online learning at scale.</h4>
                    <div class="hstack gap-2">
                      <ul class="list-unstyled mb-0 hstack gap-1">
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-white"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-white"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-white"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-bold"
                              class="fs-6 text-white"></iconify-icon></a></li>
                        <li><a class="hstack" href="javascript:void(0)"><iconify-icon icon="solar:star-line-duotone"
                              class="fs-6 text-white"></iconify-icon></a></li>
                      </ul>
                      <h6 class="mb-0 text-white fw-medium">4.0</h6>
                    </div>
                  </div>
                  <div class="d-flex align-items-center justify-content-between">
                    <div class="hstack gap-3">
                      <img src="${ASSET_BASE}/images/testimonial/testimonial-2.jpg" alt=""
                        class="img-fluid rounded-circle overflow-hidden flex-shrink-0" width="60" height="60">
                      <div>
                        <h5 class="mb-1 fw-normal text-white">Educational Institutions</h5>
                        <p class="mb-0 text-white text-opacity-70">Training Organizations Worldwide</p>
                      </div>
                    </div>
                    <span><img src="${ASSET_BASE}/images/testimonial/quete.svg" alt="quete"
                        class="img-fluid flex-shrink-0"></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-4 col-xl-3 d-flex align-items-stretch">
              <div class="card w-100" data-aos="fade-up" data-aos-delay="300" data-aos-duration="1000">
                <div class="card-body d-flex flex-column gap-5 gap-xl-11 justify-content-between">
                  <div class="d-flex flex-column gap-4">
                    <p class="mb-0">Independent Educators</p>
                    <h4 class="mb-0">Build and monetize your own digital academy with enterprise-grade infrastructure.</h4>
                  </div>
                  <div class="hstack gap-3">
                    <img src="${ASSET_BASE}/images/testimonial/testimonial-3.jpg" alt=""
                      class="img-fluid rounded-circle overflow-hidden flex-shrink-0" width="60" height="60">
                    <div>
                      <h5 class="mb-1 fw-normal">Corporate Training</h5>
                      <p class="mb-0">Employee Development</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Meet our team Section -->
    <section class="meet-our-team py-5 py-lg-11 py-xl-12">
      <div class="container">
        <div class="d-flex flex-column gap-5 gap-xl-11">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                data-aos-duration="1000">
                <span
                  class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">06</span>
                <hr class="border-line bg-white">
                <span class="badge text-bg-dark">Scale</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100"
                    data-aos-duration="1000">
                    <h2 class="mb-0">Helping Organizations Scale Learning</h2>
                    <p class="fs-5 mb-0 text-opacity-70">Educational institutions and training organizations use Trineo Stream to deliver engaging learning experiences and grow their digital presence.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6 col-xl-3 mb-7 mb-xl-0">
              <div class="meet-team d-flex flex-column gap-4" data-aos="fade-up" data-aos-delay="100"
                data-aos-duration="1000">
                <div class="meet-team-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/team/team-img-1.jpg" alt="team-img" class="img-fluid w-100">
                  <div class="meet-team-overlay p-7 d-flex flex-column justify-content-end">
                    <ul class="social list-unstyled mb-0 hstack gap-2 justify-content-end">
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-twitter.svg" alt="twitter"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-be.svg" alt="be"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-linkedin.svg" alt="linkedin"></a></li>
                    </ul>
                  </div>
                </div>
                <div class="meet-team-details">
                  <h4 class="mb-0">Coaching Institutes</h4>
                  <p class="mb-0">Launch secure online batches</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-xl-3 mb-7 mb-xl-0">
              <div class="meet-team d-flex flex-column gap-4" data-aos="fade-up" data-aos-delay="200"
                data-aos-duration="1000">
                <div class="meet-team-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/team/team-img-2.jpg" alt="team-img" class="img-fluid w-100">
                  <div class="meet-team-overlay p-7 d-flex flex-column justify-content-end">
                    <ul class="social list-unstyled mb-0 hstack gap-2 justify-content-end">
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-twitter.svg" alt="twitter"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-be.svg" alt="be"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-linkedin.svg" alt="linkedin"></a></li>
                    </ul>
                  </div>
                </div>
                <div class="meet-team-details">
                  <h4 class="mb-0">Educational Startups</h4>
                  <p class="mb-0">Scale with enterprise infrastructure</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-xl-3 mb-7 mb-xl-0">
              <div class="meet-team d-flex flex-column gap-4" data-aos="fade-up" data-aos-delay="300"
                data-aos-duration="1000">
                <div class="meet-team-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/team/team-img-3.jpg" alt="team-img" class="img-fluid w-100">
                  <div class="meet-team-overlay p-7 d-flex flex-column justify-content-end">
                    <ul class="social list-unstyled mb-0 hstack gap-2 justify-content-end">
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-twitter.svg" alt="twitter"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-be.svg" alt="be"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-linkedin.svg" alt="linkedin"></a></li>
                    </ul>
                  </div>
                </div>
                <div class="meet-team-details">
                  <h4 class="mb-0">Professional Training</h4>
                  <p class="mb-0">Certifications & workshops</p>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-xl-3 mb-7 mb-xl-0">
              <div class="meet-team d-flex flex-column gap-4" data-aos="fade-up" data-aos-delay="400"
                data-aos-duration="1000">
                <div class="meet-team-img position-relative overflow-hidden">
                  <img src="${ASSET_BASE}/images/team/team-img-4.jpg" alt="team-img" class="img-fluid w-100">
                  <div class="meet-team-overlay p-7 d-flex flex-column justify-content-end">
                    <ul class="social list-unstyled mb-0 hstack gap-2 justify-content-end">
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-twitter.svg" alt="twitter"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-be.svg" alt="be"></a></li>
                      <li><a href="#!"
                          class="btn bg-white p-2 round-45 rounded-circle hstack justify-content-center"><img
                            src="${ASSET_BASE}/images/svgs/icon-linkedin.svg" alt="linkedin"></a></li>
                    </ul>
                  </div>
                </div>
                <div class="meet-team-details">
                  <h4 class="mb-0">Corporate Training</h4>
                  <p class="mb-0">Employee learning & development</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Pricing Section -->
    <section class="pricing-section py-5 py-lg-11 py-xl-12 bg-light-gray">
      <div class="container">
        <div class="d-flex flex-column gap-5 gap-xl-10">
          <div class="d-flex flex-column gap-5 gap-xl-11">
            <div class="row gap-7 gap-xl-0">
              <div class="col-xl-4 col-xxl-4">
                <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                  data-aos-duration="1000">
                  <span
                    class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">07</span>
                  <hr class="border-line bg-white">
                  <span class="badge text-bg-dark">Plans</span>
                </div>
              </div>
              <div class="col-xl-8 col-xxl-7">
                <div class="row">
                  <div class="col-xxl-8">
                    <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100"
                      data-aos-duration="1000">
                      <h2 class="mb-0">Flexible Plans For Every Stage</h2>
                      <p class="fs-5 mb-0 text-opacity-70">Choose the plan that fits your organization's needs — from small academies to enterprise-scale training businesses.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-lg-6 col-xl-4 mb-7 mb-xl-0 d-flex align-items-stretch">
                <div class="card w-100" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
                  <div class="card-body p-7 p-xxl-5 d-flex flex-column gap-8">
                    <div class="d-flex flex-column gap-6">
                      <h5 class="mb-0 fw-medium">Starter</h5>
                      <div class="hstack gap-2"><h3 class="mb-0">Custom</h3><p class="mb-0"></p></div>
                      <p class="mb-0">Perfect for educators and small academies launching online learning.</p>
                    </div>
                    <div class="pt-8 border-top d-flex flex-column gap-6">
                      <h6 class="mb-0 fw-normal">What's Included:</h6>
                      <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Secure video hosting & protected playback</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Course & student management (LMS)</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Basic analytics and reporting</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Custom domain & basic white-labeling</h6></li>
                      </ul>
                    </div>
                    <a href="/signup" class="btn w-100 justify-content-center" data-nav="signup">
                      <span class="btn-text">Talk To Sales</span>
                      <iconify-icon icon="lucide:arrow-up-right" class="btn-icon bg-white text-dark round-52 rounded-circle hstack justify-content-center fs-7 shadow-sm"></iconify-icon>
                    </a>
                  </div>
                </div>
              </div>
              <div class="col-lg-6 col-xl-4 mb-7 mb-xl-0 d-flex align-items-stretch">
                <div class="card w-100" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                  <div class="card-body p-7 p-xxl-5 d-flex flex-column gap-8">
                    <div class="d-flex flex-column gap-6">
                      <div class="hstack gap-3"><h5 class="mb-0 fw-medium">Growth</h5><span class="badge text-bg-dark hstack gap-2"><iconify-icon icon="lucide:flame" class="fs-5"></iconify-icon>Most Popular</span></div>
                      <div class="hstack gap-2"><h3 class="mb-0">Custom</h3><p class="mb-0"></p></div>
                      <p class="mb-0">Advanced features for growing institutes and training organizations.</p>
                    </div>
                    <div class="pt-8 border-top d-flex flex-column gap-6">
                      <h6 class="mb-0 fw-normal">What's Included:</h6>
                      <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Everything in the Starter Plan</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Advanced analytics & cohort reporting</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Branded player & custom domain</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Payment & enrollment integrations</h6></li>
                      </ul>
                    </div>
                    <a href="/signup" class="btn w-100 justify-content-center" data-nav="signup">
                      <span class="btn-text">Talk To Sales</span>
                      <iconify-icon icon="lucide:arrow-up-right" class="btn-icon bg-white text-dark round-52 rounded-circle hstack justify-content-center fs-7 shadow-sm"></iconify-icon>
                    </a>
                  </div>
                </div>
              </div>
              <div class="col-lg-6 col-xl-4 mb-7 mb-xl-0 d-flex align-items-stretch">
                <div class="card w-100" data-aos="fade-up" data-aos-delay="300" data-aos-duration="1000">
                  <div class="card-body p-7 p-xxl-5 d-flex flex-column gap-8">
                    <div class="d-flex flex-column gap-6">
                      <h5 class="mb-0 fw-medium">Enterprise</h5>
                      <div class="hstack gap-2"><h3 class="mb-0">Custom</h3><p class="mb-0"></p></div>
                      <p class="mb-0">Custom infrastructure, dedicated support, and enterprise-grade scalability.</p>
                    </div>
                    <div class="pt-8 border-top d-flex flex-column gap-6">
                      <h6 class="mb-0 fw-normal">What's Included:</h6>
                      <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Everything in the Growth Plan</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">SAML/SSO, advanced security, and SLAs</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Dedicated infrastructure & scaling</h6></li>
                        <li class="hstack gap-3"><span class="round-32 rounded-circle bg-primary flex-shrink-0 hstack justify-content-center"><iconify-icon icon="lucide:check" class="fs-6 text-dark"></iconify-icon></span><h6 class="mb-0 fw-normal">Enterprise onboarding & priority support</h6></li>
                      </ul>
                    </div>
                    <a href="/signup" class="btn w-100 justify-content-center" data-nav="signup">
                      <span class="btn-text">Talk To Sales</span>
                      <iconify-icon icon="lucide:arrow-up-right" class="btn-icon bg-white text-dark round-52 rounded-circle hstack justify-content-center fs-7 shadow-sm"></iconify-icon>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="d-flex flex-column gap-8" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
            <p class="fs-5 mb-0 text-center text-dark">Trusted by modern academies, educators, and training organizations</p>
            <div class="marquee w-100 d-flex align-items-center overflow-hidden">
              <div class="marquee-content d-flex align-items-center gap-8">
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-1.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-2.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-3.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-4.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-5.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-1.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-2.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-3.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-4.svg" alt="partners" class="img-fluid"></div>
                <div class="marquee-tag hstack justify-content-center"><img src="${ASSET_BASE}/images/pricing/partners-5.svg" alt="partners" class="img-fluid"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  FAQ Section -->
    <section class="faq py-5 py-lg-11 py-xl-12">
      <div class="container">
        <div class="d-flex flex-column gap-5 gap-xl-11">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100"
                data-aos-duration="1000">
                <span class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">08</span>
                <hr class="border-line bg-white">
                <span class="badge text-bg-dark">FAQ</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-9">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
                    <h2 class="mb-0">Frequently asked questions</h2>
                    <p class="fs-5 mb-0 text-opacity-70">Find answers to common questions about Trineo Stream's platform, features, pricing, and how it can help your learning business.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row justify-content-end">
            <div class="col-xl-8">
              <div class="accordion accordion-flush" id="accordionFlushExample" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                <div class="accordion-item">
                  <h2 class="accordion-header"><button class="accordion-button collapsed fs-8 fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">What is Trineo Stream and who is it for?</button></h2>
                  <div id="flush-collapseOne" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample"><div class="accordion-body pt-0 fs-5 text-dark">Trineo Stream is a premium OTT-style learning platform built for institutes, educators, coaching centers, and training organizations. It provides secure video streaming, student management, analytics, and enterprise-grade infrastructure to help you launch and scale your digital academy.</div></div>
                </div>
                <div class="accordion-item">
                  <h2 class="accordion-header"><button class="accordion-button collapsed fs-8 fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseTwo" aria-expanded="false" aria-controls="flush-collapseTwo">How does the video streaming work?</button></h2>
                  <div id="flush-collapseTwo" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample"><div class="accordion-body pt-0 fs-5 text-dark">Trineo Stream delivers high-quality prerecorded and live learning experiences with a professional OTT-style viewing environment. Your content is protected with dynamic watermarking, session management, and access controls.</div></div>
                </div>
                <div class="accordion-item">
                  <h2 class="accordion-header"><button class="accordion-button collapsed fs-8 fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseThree" aria-expanded="false" aria-controls="flush-collapseThree">Can I launch under my own brand?</button></h2>
                  <div id="flush-collapseThree" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample"><div class="accordion-body pt-0 fs-5 text-dark">Yes! Trineo Stream offers a complete white-label experience. You can launch under your own brand with custom domains, institute identity, and personalized student experiences — making it truly your own platform.</div></div>
                </div>
                <div class="accordion-item">
                  <h2 class="accordion-header"><button class="accordion-button collapsed fs-8 fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseFour" aria-expanded="false" aria-controls="flush-collapseFour">What analytics and reporting features are available?</button></h2>
                  <div id="flush-collapseFour" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample"><div class="accordion-body pt-0 fs-5 text-dark">Trineo Stream includes advanced analytics that track student engagement, watch time, course completion rates, and learning performance in real time. You can gain actionable insights to improve your learning programs and scale effectively.</div></div>
                </div>
                <div class="accordion-item border-bottom">
                  <h2 class="accordion-header"><button class="accordion-button collapsed fs-8 fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseFive" aria-expanded="false" aria-controls="flush-collapseFive">Is Trineo Stream secure enough for enterprise use?</button></h2>
                  <div id="flush-collapseFive" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample"><div class="accordion-body pt-0 fs-5 text-dark">Absolutely. Trineo Stream includes enterprise security features like dynamic watermarking, session management, access controls, audit logging, and 99.9% platform availability — all running on 100% cloud-based infrastructure.</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Recent news Section -->
    <section class="Recent-news bg-light-gray py-5 py-lg-11 py-xl-12">
      <div class="container">
        <div class="d-flex flex-column gap-5 gap-xl-11">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100" data-aos-duration="1000">
                <span class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">09</span>
                <hr class="border-line bg-white">
                <span class="badge text-bg-dark">Products</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
                    <h2 class="mb-0">Explore The Trineo Ecosystem</h2>
                    <p class="fs-5 mb-0 text-opacity-70">Discover the connected suite of products that power modern learning businesses — from streaming to analytics to secure identity management.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-xl-6 mb-7 mb-xl-0">
              <div class="resources d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
                <a href="#" class="resources-img resources-img-first position-relative overflow-hidden d-block">
                  <img src="${ASSET_BASE}/images/resources/resources-1.jpg" alt="resources" class="img-fluid">
                </a>
                <div class="resources-details"><p class="mb-0">Trineo Blog</p><h4 class="mb-0">Technology insights and industry updates</h4></div>
              </div>
            </div>
            <div class="col-md-6 col-xl-3 mb-7 mb-xl-0">
              <div class="resources d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                <a href="#" class="resources-img position-relative overflow-hidden d-block">
                  <img src="${ASSET_BASE}/images/resources/resources-2.jpg" alt="resources" class="img-fluid">
                </a>
                <div class="resources-details"><p class="mb-0">Trineo Auth</p><h4 class="mb-0">Secure identity and access management</h4></div>
              </div>
            </div>
            <div class="col-md-6 col-xl-3 mb-7 mb-xl-0">
              <div class="resources d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="300" data-aos-duration="1000">
                <a href="#" class="resources-img position-relative overflow-hidden d-block">
                  <img src="${ASSET_BASE}/images/resources/resources-3.jpg" alt="resources" class="img-fluid">
                </a>
                <div class="resources-details"><p class="mb-0">Trineo Cloud</p><h4 class="mb-0">Future-ready infrastructure services</h4></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--  Get in touch Section -->
    <section class="get-in-touch py-5 py-lg-11 py-xl-12">
      <div class="container">
        <div class="d-flex flex-column gap-5 gap-xl-10">
          <div class="row gap-7 gap-xl-0">
            <div class="col-xl-4 col-xxl-4">
              <div class="d-flex align-items-center gap-7 py-2" data-aos="fade-right" data-aos-delay="100" data-aos-duration="1000">
                <span class="round-36 flex-shrink-0 text-dark rounded-circle bg-primary hstack justify-content-center fw-medium">10</span>
                <hr class="border-line bg-white">
                <span class="badge text-bg-dark">Get Started</span>
              </div>
            </div>
            <div class="col-xl-8 col-xxl-7">
              <div class="row">
                <div class="col-xxl-8">
                  <div class="d-flex flex-column gap-6" data-aos="fade-up" data-aos-delay="100" data-aos-duration="1000">
                    <h2 class="mb-0">Build The Future Of Learning</h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row justify-content-between gap-7 gap-xl-0">
            <div class="col-xl-3">
              <p class="mb-0 fs-5" data-aos="fade-right" data-aos-delay="100" data-aos-duration="1000">Launch your own streaming academy, engage learners, and scale your educational business with Trineo Stream.</p>
            </div>
            <div class="col-xl-8">
              <form id="studiova-contact-form" class="d-flex flex-column gap-7" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                <div><input type="text" class="form-control border-bottom border-dark" placeholder="Name"></div>
                <div><input type="email" class="form-control border-bottom border-dark" placeholder="Email"></div>
                <div><textarea class="form-control border-bottom border-dark" placeholder="Tell us about your learning platform needs" rows="3"></textarea></div>
                <button type="submit" class="btn w-100 justify-content-center">
                  <span class="btn-text">Get Started Today</span>
                  <iconify-icon icon="lucide:arrow-up-right" class="btn-icon bg-white text-dark round-52 rounded-circle hstack justify-content-center fs-7 shadow-sm"></iconify-icon>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <footer class="footer bg-dark py-5 py-lg-11 py-xl-12">
    <div class="container">
      <div class="row">
        <div class="col-xl-5 mb-8 mb-xl-0">
          <div class="d-flex flex-column gap-8 pe-xl-5">
            <h2 class="mb-0 text-white">Trineo Stream</h2>
            <div class="d-flex flex-column gap-2">
              <p class="fs-5 text-white mb-0">The modern operating system for educational streaming. Build. Stream. Learn. Scale.</p>
              <a href="mailto:info@trineostream.com" class="link-hover hstack gap-3 text-white fs-5 mt-3">
                <iconify-icon icon="lucide:arrow-up-right" class="fs-7 text-primary"></iconify-icon>
                info@trineostream.com
              </a>
            </div>
          </div>
        </div>
        <div class="col-md-4 col-xl-2 mb-8 mb-xl-0">
          <ul class="footer-menu list-unstyled mb-0 d-flex flex-column gap-2">
            <li><a class="link-hover fs-5 text-white" href="/">Stream</a></li>
            <li><a class="link-hover fs-5 text-white" href="#">Learn</a></li>
            <li><a class="link-hover fs-5 text-white" href="#">Blog</a></li>
            <li><a class="link-hover fs-5 text-white" href="#">Workspace</a></li>
            <li><a class="link-hover fs-5 text-white" href="#">Analytics</a></li>
          </ul>
        </div>
        <div class="col-md-4 col-xl-2 mb-8 mb-xl-0">
          <ul class="footer-menu list-unstyled mb-0 d-flex flex-column gap-2">
            <li><a class="link-hover fs-5 text-white" href="#">About</a></li>
            <li><a class="link-hover fs-5 text-white" href="#">Contact</a></li>
            <li><a class="link-hover fs-5 text-white" href="#">Privacy</a></li>
          </ul>
        </div>
        <div class="col-md-4 col-xl-3 mb-8 mb-xl-0">
          <p class="mb-0 text-white text-opacity-70 text-md-end">© Trineo Stream 2026</p>
        </div>
      </div>
    </div>
  </footer>

  <div class="get-template hstack gap-2">
    <button class="btn bg-primary p-2 round-52 rounded-circle hstack justify-content-center flex-shrink-0"
      id="scrollToTopBtn">
      <iconify-icon icon="lucide:arrow-up" class="fs-7 text-dark"></iconify-icon>
    </button>
  </div>
`;

// ─── Helper: Dynamically load a script ──────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

// ─── Helper: Load a CSS stylesheet ──────────────────────────────────────────
function loadStylesheet(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auth guard: redirect authenticated users to their dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'owner') { navigate('/owner', { replace: true }); return; }
        if (user.role === 'admin') { navigate('/admin', { replace: true }); return; }
        navigate('/student', { replace: true });
      } catch { /* ignore parse errors */ }
    }
  }, [navigate]);

  // Native scroll handler for fixed-header and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const header = container.querySelector('header');
      
      // Try to read scroll position from window first, then fall back to scrollable parent elements
      let scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      if (scrollTop === 0) {
        const root = document.getElementById('root');
        if (root && root.scrollTop > 0) {
          scrollTop = root.scrollTop;
        } else {
          let parent = container.parentElement;
          while (parent) {
            if (parent.scrollTop > 0) {
              scrollTop = parent.scrollTop;
              break;
            }
            parent = parent.parentElement;
          }
        }
      }

      if (header) {
        if (scrollTop >= 60) {
          header.classList.add('fixed-header');
        } else {
          header.classList.remove('fixed-header');
        }
      }

      const scrollBtn = container.querySelector('#scrollToTopBtn') as HTMLElement | null;
      if (scrollBtn) {
        scrollBtn.style.display = scrollTop > 100 ? 'flex' : 'none';
      }
    };

    // Use capture: true so scroll events from nested containers (e.g. #root) are caught
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    
    // Bind click event to scroll-to-top button
    let scrollBtn: HTMLElement | null = null;
    const handleScrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Scroll parent containers back to top too
      const root = document.getElementById('root');
      if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
      let parent = containerRef.current?.parentElement;
      while (parent) {
        parent.scrollTo({ top: 0, behavior: 'smooth' });
        parent = parent.parentElement;
      }
    };
    
    // Wait a brief moment or check periodically for button availability
    const timer = setInterval(() => {
      const container = containerRef.current;
      if (container) {
        scrollBtn = container.querySelector('#scrollToTopBtn') as HTMLElement | null;
        if (scrollBtn) {
          scrollBtn.addEventListener('click', handleScrollToTop);
          clearInterval(timer);
        }
      }
    }, 500);

    // Run once initially
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      clearInterval(timer);
      if (scrollBtn) {
        scrollBtn.removeEventListener('click', handleScrollToTop);
      }
    };
  }, []);

  // Event delegation: intercept clicks on anchor tags
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href], button[type="submit"]');
      if (!target) return;

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute('href');

      if (!href) return;

      // Internal React routes
      if (href === '/login' || href === '/signup' || href === '/') {
        e.preventDefault();
        navigate(href);
        return;
      }

      // Anchor scroll links (e.g. #services)
      if (href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const el = container.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Block old HTML page navigations
      if (href.endsWith('.html')) {
        e.preventDefault();
        if (href.includes('sign-in')) navigate('/login');
        else if (href.includes('sign-up')) navigate('/signup');
        else if (href.includes('contact')) navigate('/signup');
        // Other .html links just stay on the page
        return;
      }

      // javascript:void(0) — do nothing
      if (href.startsWith('javascript:')) {
        e.preventDefault();
        return;
      }
    };

    // Contact form prevention
    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.id === 'studiova-contact-form') {
        e.preventDefault();
        navigate('/signup');
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('submit', handleSubmit);
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('submit', handleSubmit);
    };
  }, [navigate]);

  // Load vendor scripts and initialize plugins
  useEffect(() => {
    // Load owl carousel CSS
    loadStylesheet(`${ASSET_BASE}/libs/owl.carousel/dist/assets/owl.carousel.min.css`);

    let cancelled = false;

    async function initPlugins() {
      try {
        // Load scripts in sequence: jQuery → Bootstrap → Owl → AOS → Custom → Iconify
        await loadScript(`${ASSET_BASE}/libs/jquery/dist/jquery.min.js`);
        await loadScript(`${ASSET_BASE}/libs/bootstrap/dist/js/bootstrap.bundle.min.js`);
        await loadScript(`${ASSET_BASE}/libs/owl.carousel/dist/owl.carousel.min.js`);
        await loadScript(`${ASSET_BASE}/libs/aos-master/dist/aos.js`);
        await loadScript('https://cdn.jsdelivr.net/npm/iconify-icon@1.0.8/dist/iconify-icon.min.js');

        if (cancelled) return;

        // Initialize plugins within the scoped container
        const $ = (window as any).jQuery;
        const AOS = (window as any).AOS;

        if ($ && containerRef.current) {
          const $scope = $(containerRef.current);

          // Owl Carousel
          $scope.find('.featured-projects-slider .owl-carousel').owlCarousel({
            center: true,
            loop: true,
            margin: 30,
            nav: false,
            dots: false,
            autoplay: true,
            autoplayTimeout: 5000,
            autoplayHoverPause: false,
            responsive: { 0: { items: 1 }, 600: { items: 2 }, 1000: { items: 3 }, 1200: { items: 4 } }
          });

        }

        // AOS
        if (AOS) {
          AOS.init({ once: true });
        }
      } catch (err) {
        console.error('Failed to load Studiova plugins:', err);
      }
    }

    initPlugins();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="studiova-scope"
      dangerouslySetInnerHTML={{ __html: LANDING_HTML }}
    />
  );
}
