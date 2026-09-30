import pirateOneLogo from '@/assets/pirateone-logo.png';

const BrandFooter = () => (
  <footer className="relative z-10 flex w-full flex-col items-center justify-center border-t border-white/[0.06] bg-black/20 px-4 py-8">
    <img
      src={pirateOneLogo}
      alt="PirateOne"
      className="h-auto w-[min(60vw,12rem)] object-contain brightness-0 invert opacity-90"
    />
  </footer>
);

export default BrandFooter;