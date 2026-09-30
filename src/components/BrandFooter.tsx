import pirateOneLogo from '@/assets/pirateone-logo.png';

const BrandFooter = () => (
  <footer className="relative z-10 flex w-full flex-col items-center justify-center border-t border-white/[0.06] bg-black/20 px-4 py-10 sm:py-14">
    <img
      src={pirateOneLogo}
      alt="PirateOne"
      className="h-auto w-[min(84vw,34rem)] object-contain drop-shadow-[0_0_28px_rgba(212,175,55,0.12)]"
    />
  </footer>
);

export default BrandFooter;