import { useState, useEffect, useRef } from 'react';

export function useInView(options = {}) {
  const { once = true, threshold = 0.1, root = null, rootMargin = '0px' } = options;
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (once) {
          observer.unobserve(entry.target);
        }
      } else if (!once) {
        setInView(false);
      }
    }, { threshold, root, rootMargin });

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, root, rootMargin, once]);

  return [ref, inView];
}
