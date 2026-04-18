"use client";

import { geoMercator, geoPath } from "d3-geo";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { fetchSjaellandGeoJSON, type MunicipalityFeatureCollection } from "@/lib/geo/sjaelland";

const width = 900;
const height = 1600;
const aspectRatio = height / width;
const initialViewBox = { x: 0, y: 0, width, height };
const minViewWidth = width / 13;
const zoomStep = 1.22;
const dragActivationPx = 10;
const initialDesktopZoomLevel = 4.7;
const initialMobileZoomLevel = 3.1;
const initialDesktopBreakpoint = 1024;
const initialZoomSlug = "naestved";
const zoomInEvent = "branches-map:zoom-in";
const zoomOutEvent = "branches-map:zoom-out";
const resetEvent = "branches-map:reset";
const kioskViewportAnimationDurationMs = 1500;

const labelTuning: Record<
  string,
  {
    dx?: number;
    dy?: number;
    iconDy?: number;
  }
> = {
  albertslund: { dx: -12, dy: 2 },
  ballerup: { dx: -10, dy: -8 },
  brondby: { dx: -10, dy: 6 },
  dragor: { dx: 12, dy: 14 },
  frederiksberg: { dx: -2, dy: 0 },
  gentofte: { dx: 12, dy: -8 },
  gladsaxe: { dx: 8, dy: -10 },
  glostrup: { dx: -6, dy: -6 },
  herlev: { dx: -2, dy: -10 },
  helsingor: { dx: 10, dy: -10 },
  hillerod: { dx: 0, dy: 4 },
  holbaek: { dx: 0, dy: 4 },
  horsholm: { dx: 10, dy: -10 },
  hvidovre: { dx: -8, dy: 10 },
  ishoj: { dx: -8, dy: 10 },
  kobenhavn: { dx: 10, dy: -4, iconDy: -1 },
  koge: { dx: 8, dy: 10 },
  kalundborg: { dx: -8, dy: 6 },
  "lyngby-taarbaek": { dx: 8, dy: -12 },
  naestved: { dx: 0, dy: 12 },
  greve: { dx: 10, dy: 14 },
  "hoje-taastrup": { dx: -12, dy: 14 },
  rodovre: { dx: -10, dy: -4 },
  ringsted: { dx: 0, dy: 4 },
  roskilde: { dx: -8, dy: -4 },
  soro: { dx: -8, dy: 0 },
  slagelse: { dx: -8, dy: 8 },
  stevns: { dx: 12, dy: 10 },
  taarnby: { dx: 8, dy: 10 },
  vallensbaek: { dx: -12, dy: 8 },
  vordingborg: { dx: 0, dy: -10 },
};

type ViewBox = typeof initialViewBox;

type Point = {
  x: number;
  y: number;
};

type PointerSnapshot = {
  clientX: number;
  clientY: number;
};

type DragGesture = {
  type: "drag";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewBox: ViewBox;
  hasMoved: boolean;
  startSlug: string | null;
};

type PinchGesture = {
  type: "pinch";
  pointerIds: [number, number];
  startDistance: number;
  startViewBox: ViewBox;
  anchorWorld: Point;
};

type GestureState = DragGesture | PinchGesture;

type MapFeature = {
  municipality: MunicipalitySummary;
  pathData: string;
  marker: Point;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    area: number;
  };
};

type RenderPathFeature = {
  slug: string;
  pathData: string;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWidth: number;
};

type RenderOverlayFeature = {
  slug: string;
  marker: Point;
  iconScale: number;
  visibleIndustries: MunicipalitySummary["topIndustries"];
  iconFontSize: number;
  iconPositions: Array<{ x: number; y: number }>;
  labelFontSize: number;
  labelY: number;
  labelOpacity: number;
  labelFill: string;
  labelStroke: string;
  labelStrokeWidth: number;
  labelFontWeight: number;
  uppercaseName: string;
  hasUnreadUpdate: boolean;
  updateMarkerPosition: { x: number; y: number };
  shouldAnimateUpdateMarker: boolean;
};

type ViewportAnimationMode = "instant" | "smooth";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function interpolateViewBox(start: ViewBox, end: ViewBox, progress: number): ViewBox {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    width: start.width + (end.width - start.width) * progress,
    height: start.height + (end.height - start.height) * progress,
  };
}

function clampViewBox(viewBox: ViewBox): ViewBox {
  const nextWidth = clamp(viewBox.width, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const maxX = width - nextWidth;
  const maxY = height - nextHeight;

  return {
    x: clamp(viewBox.x, 0, maxX),
    y: clamp(viewBox.y, 0, maxY),
    width: nextWidth,
    height: nextHeight,
  };
}

function scaleViewBox(viewBox: ViewBox, factor: number, center: Point): ViewBox {
  const nextWidth = clamp(viewBox.width / factor, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const relativeX = (center.x - viewBox.x) / viewBox.width;
  const relativeY = (center.y - viewBox.y) / viewBox.height;

  return clampViewBox({
    x: center.x - relativeX * nextWidth,
    y: center.y - relativeY * nextHeight,
    width: nextWidth,
    height: nextHeight,
  });
}

function createFeatureViewBox(bounds: MapFeature["bounds"]): ViewBox {
  const longestSide = Math.max(bounds.width, bounds.height);
  const zoomBias =
    longestSide < 42 ? 0.48 : longestSide < 60 ? 0.58 : longestSide < 90 ? 0.72 : 0.88;
  const paddingRatio = longestSide < 60 ? 0.08 : longestSide < 110 ? 0.12 : 0.18;
  const padding = clamp(longestSide * paddingRatio, 8, 34);
  const paddedWidth = bounds.width + padding * 2;
  const paddedHeight = bounds.height + padding * 2;
  const fitWidth = Math.max(paddedWidth, paddedHeight / aspectRatio) * zoomBias;
  const nextWidth = clamp(fitWidth, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return clampViewBox({
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  });
}

function createFixedZoomFeatureViewBox(bounds: MapFeature["bounds"], zoomLevel: number): ViewBox {
  const nextWidth = clamp(width / zoomLevel, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return clampViewBox({
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  });
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number, viewBox: ViewBox): Point {
  const rect = svg.getBoundingClientRect();

  return {
    x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
  };
}

function getIconFontSize(bounds: MapFeature["bounds"], isFocused: boolean) {
  const maxSize = isFocused ? 14 : 12.5;
  return clamp(Math.min(bounds.width / 6.4, bounds.height / 4.2), 8.5, maxSize);
}

function getLabelFontSize(bounds: MapFeature["bounds"], isFocused: boolean) {
  const maxSize = isFocused ? 22 : 14;
  return clamp(Math.min(bounds.width / 6.4, bounds.height / 5.6), 9, maxSize);
}

function shouldShowLabel(zoomLevel: number, isFeatured: boolean, isFocused: boolean) {
  return isFocused || isFeatured || zoomLevel >= 2.8;
}

function getLabelYOffset(iconCount: number) {
  if (iconCount >= 3) {
    return 14;
  }

  if (iconCount >= 1) {
    return 10;
  }

  return 4;
}

function getVisibleIndustries(
  industries: MunicipalitySummary["topIndustries"],
  zoomLevel: number,
  isFeatured: boolean,
  isFocused: boolean,
) {
  if (isFocused) {
    return industries.slice(0, 3);
  }

  if (isFeatured) {
    return industries.slice(0, zoomLevel >= 1.8 ? 3 : 2);
  }

  if (zoomLevel >= 2.7) {
    return industries.slice(0, 1);
  }

  return [];
}

function getIconPositions(count: number, bounds: MapFeature["bounds"], iconDy = 0) {
  const compact = bounds.width < 52 || bounds.height < 46;
  const spreadX = clamp(bounds.width * (compact ? 0.13 : 0.16), compact ? 9 : 12, compact ? 20 : 28);
  const wideSpreadX = spreadX * (compact ? 1.08 : 1.18);
  const topY = compact ? -14 : -20;
  const sideY = compact ? -5 : -6;
  const singleY = compact ? -7 : -10;

  if (count <= 1) {
    return [{ x: 0, y: singleY + iconDy }];
  }

  if (count === 2) {
    return [
      { x: -spreadX, y: singleY + iconDy },
      { x: spreadX, y: singleY + iconDy },
    ];
  }

  return [
    { x: -wideSpreadX, y: sideY + iconDy },
    { x: 0, y: topY + iconDy },
    { x: wideSpreadX, y: sideY + iconDy },
  ];
}

function getUpdateMarkerPosition(bounds: MapFeature["bounds"], iconCount: number) {
  const compact = bounds.width < 52 || bounds.height < 46;
  const x = clamp(bounds.width * (compact ? 0.1 : 0.16), compact ? 12 : 18, compact ? 22 : 34);

  if (iconCount >= 2) {
    return { x, y: compact ? -24 : -31 };
  }

  if (iconCount === 1) {
    return { x, y: compact ? -19 : -23 };
  }

  return { x, y: compact ? -10 : -12 };
}

function getDistance(left: PointerSnapshot, right: PointerSnapshot) {
  return Math.hypot(right.clientX - left.clientX, right.clientY - left.clientY);
}

function getCenter(left: PointerSnapshot, right: PointerSnapshot) {
  return {
    x: (left.clientX + right.clientX) / 2,
    y: (left.clientY + right.clientY) / 2,
  };
}

function getEventMunicipalitySlug(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest("[data-municipality-slug]")?.getAttribute("data-municipality-slug") ?? null
    : null;
}

export function SjaellandMunicipalityMap({
  municipalities,
  ariaLabel,
  focusedSlug,
  detailsSlug,
  focusViewportToken,
  focusViewportAnimationMode = "instant",
  featuredSlugs,
  followedMunicipalitySlugs,
  updatedMunicipalitySlugs,
  onMunicipalityPress,
}: {
  municipalities: MunicipalitySummary[];
  ariaLabel: string;
  focusedSlug: string | null;
  detailsSlug: string | null;
  focusViewportToken?: number;
  focusViewportAnimationMode?: ViewportAnimationMode;
  featuredSlugs: string[];
  followedMunicipalitySlugs: string[];
  updatedMunicipalitySlugs: string[];
  onMunicipalityPress: (slug: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const pointersRef = useRef(new Map<number, PointerSnapshot>());
  const movedDuringGestureRef = useRef(false);
  const suppressClickRef = useRef(false);
  const initialViewAppliedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const currentViewBoxRef = useRef(initialViewBox);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [geoData, setGeoData] = useState<MunicipalityFeatureCollection | null>(null);
  const zoomLevel = width / viewBox.width;

  useEffect(() => {
    currentViewBoxRef.current = viewBox;
  }, [viewBox]);

  const clearViewportAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const applyViewBox = useCallback((nextViewBox: ViewBox) => {
    const clampedViewBox = clampViewBox(nextViewBox);
    currentViewBoxRef.current = clampedViewBox;
    setViewBox(clampedViewBox);
  }, []);

  const animateViewBoxTo = useCallback((targetViewBox: ViewBox, mode: ViewportAnimationMode) => {
    clearViewportAnimation();

    if (mode === "instant") {
      applyViewBox(targetViewBox);
      return;
    }

    const startViewBox = currentViewBoxRef.current;
    const nextViewBox = clampViewBox(targetViewBox);
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / kioskViewportAnimationDurationMs);
      applyViewBox(interpolateViewBox(startViewBox, nextViewBox, easeInOutCubic(progress)));

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      animationFrameRef.current = null;
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [applyViewBox, clearViewportAnimation]);

  useEffect(() => {
    let isMounted = true;
    fetchSjaellandGeoJSON()
      .then((data) => {
        if (isMounted) setGeoData(data);
      })
      .catch((err) => console.error("Fejl ved indlæsning af kort:", err));
    return () => {
      isMounted = false;
      clearViewportAnimation();
    };
  }, [clearViewportAnimation]);

  const mapHelpers = useMemo(() => {
    if (!geoData) return null;
    const proj = geoMercator().fitExtent(
      [
        [42, 42],
        [width - 42, height - 42],
      ],
      geoData as never,
    );
    return { projection: proj, path: geoPath(proj) };
  }, [geoData]);

  const features = useMemo(() => {
    if (!geoData || !mapHelpers) return [];
    const { path } = mapHelpers;
    const municipalityMap = new Map(municipalities.map((municipality) => [municipality.code, municipality]));

    return geoData.features
      .map((feature) => {
        const municipality = municipalityMap.get(feature.properties.code);
        const pathData = path(feature as never);

        if (!municipality || !pathData) {
          return null;
        }

        const [centroidX, centroidY] = path.centroid(feature as never);
        const [[minX, minY], [maxX, maxY]] = path.bounds(feature as never);
        const tuning = labelTuning[municipality.slug] ?? {};

        return {
          municipality,
          pathData,
          marker: {
            x: centroidX + (tuning.dx ?? 0),
            y: centroidY + (tuning.dy ?? 0),
          },
          bounds: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            area: (maxX - minX) * (maxY - minY),
          },
        } satisfies MapFeature;
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }, [municipalities, geoData, mapHelpers]);

  const featuredSlugSet = useMemo(() => new Set(featuredSlugs), [featuredSlugs]);
  const followedSlugSet = useMemo(() => new Set(followedMunicipalitySlugs), [followedMunicipalitySlugs]);
  const updatedSlugSet = useMemo(() => new Set(updatedMunicipalitySlugs), [updatedMunicipalitySlugs]);
  const shouldAnimateUpdateMarkers = updatedMunicipalitySlugs.length > 0 && updatedMunicipalitySlugs.length <= 6;
  const featureMap = useMemo(
    () => new Map(features.map((feature) => [feature.municipality.slug, feature])),
    [features],
  );
  const renderPathFeatures = useMemo<RenderPathFeature[]>(
    () =>
      features.map((feature) => {
        const { municipality, pathData } = feature;
        const isFocused = municipality.slug === focusedSlug;
        const isDetailed = municipality.slug === detailsSlug;
        const isFeatured = featuredSlugSet.has(municipality.slug);
        const isFollowed = followedSlugSet.has(municipality.slug);
        const isHovered = municipality.slug === hoveredSlug;

        return {
          slug: municipality.slug,
          pathData,
          fillColor: isFocused
            ? municipality.topIndustries[0]?.accentColor ?? "#0f766e"
            : isFollowed
              ? "#bdebd4"
              : isFeatured
                ? municipality.topIndustries[0]?.accentColor ?? "#94a3b8"
                : "#d7dfdc",
          fillOpacity: isDetailed ? 0.38 : isFocused ? 0.3 : isFollowed ? 0.36 : isFeatured ? 0.12 : 0.08,
          strokeColor: isFocused ? "#0f172a" : isFollowed ? "#087f5b" : "#475569",
          strokeOpacity: isHovered || isFocused ? 0.82 : isFollowed ? 0.52 : 0.28,
          strokeWidth: isFocused ? 2.2 : isHovered ? 1.65 : isFollowed ? 1.45 : 1.2,
        };
      }),
    [detailsSlug, featuredSlugSet, features, focusedSlug, followedSlugSet, hoveredSlug],
  );
  const renderOverlayFeatures = useMemo<RenderOverlayFeature[]>(
    () =>
      features.flatMap((feature) => {
        const { municipality, marker, bounds } = feature;
        const tuning = labelTuning[municipality.slug] ?? {};
        const isFocused = municipality.slug === focusedSlug;
        const isFeatured = featuredSlugSet.has(municipality.slug);
        const hasUnreadUpdate = updatedSlugSet.has(municipality.slug);
        const showLabel = shouldShowLabel(zoomLevel, isFeatured, isFocused);
        const visibleIndustries = getVisibleIndustries(
          municipality.topIndustries,
          zoomLevel,
          isFeatured,
          isFocused,
        );

        if (!showLabel && visibleIndustries.length === 0 && !hasUnreadUpdate) {
          return [];
        }

        const iconScale = isDesktopViewport
          ? clamp(1 / Math.pow(zoomLevel, 0.58), 0.36, 0.72)
          : clamp(1 / Math.pow(zoomLevel, 0.14), 0.76, 1);

        return [
          {
            slug: municipality.slug,
            marker,
            iconScale,
            visibleIndustries,
            iconFontSize: getIconFontSize(bounds, isFocused),
            iconPositions: getIconPositions(visibleIndustries.length, bounds, tuning.iconDy ?? 0),
            labelFontSize: getLabelFontSize(bounds, isFocused),
            labelY: getLabelYOffset(visibleIndustries.length),
            labelOpacity: isFocused ? 1 : isFeatured ? 0.96 : 0.84,
            labelFill: isFocused ? "#0f172a" : "rgba(15,23,42,0.86)",
            labelStroke: isFocused ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.82)",
            labelStrokeWidth: isFocused ? 2.2 : 1.75,
            labelFontWeight: isFocused ? 700 : 600,
            uppercaseName: showLabel ? municipality.name.toLocaleUpperCase("da-DK") : "",
            hasUnreadUpdate,
            updateMarkerPosition: getUpdateMarkerPosition(bounds, visibleIndustries.length),
            shouldAnimateUpdateMarker: hasUnreadUpdate && shouldAnimateUpdateMarkers,
          },
        ];
      }),
    [
      featuredSlugSet,
      features,
      focusedSlug,
      isDesktopViewport,
      shouldAnimateUpdateMarkers,
      updatedSlugSet,
      zoomLevel,
    ],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${initialDesktopBreakpoint}px)`);

    function updateViewportMode() {
      setIsDesktopViewport(mediaQuery.matches);
    }

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (initialViewAppliedRef.current || features.length === 0 || !focusedSlug) {
      return;
    }

    const feature = featureMap.get(focusedSlug);
    if (!feature) {
      return;
    }

    const nextViewBox =
      focusedSlug === initialZoomSlug
        ? createFixedZoomFeatureViewBox(
            feature.bounds,
            window.innerWidth >= initialDesktopBreakpoint ? initialDesktopZoomLevel : initialMobileZoomLevel,
          )
        : createFeatureViewBox(feature.bounds);

    initialViewAppliedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      applyViewBox(nextViewBox);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [applyViewBox, featureMap, features.length, focusedSlug]);

  useEffect(() => {
    if (!initialViewAppliedRef.current || !focusedSlug) {
      return;
    }

    const feature = featureMap.get(focusedSlug);
    if (!feature) {
      return;
    }

    const nextViewBox =
      focusedSlug === initialZoomSlug
        ? createFixedZoomFeatureViewBox(
            feature.bounds,
            window.innerWidth >= initialDesktopBreakpoint ? initialDesktopZoomLevel : initialMobileZoomLevel,
          )
        : createFeatureViewBox(feature.bounds);

    const frame = window.requestAnimationFrame(() => {
      animateViewBoxTo(nextViewBox, focusViewportAnimationMode);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [animateViewBoxTo, featureMap, focusViewportAnimationMode, focusViewportToken, focusedSlug]);

  useEffect(() => {
    function handleZoomIn() {
      clearViewportAnimation();
      applyViewBox(
        scaleViewBox(currentViewBoxRef.current, zoomStep, {
          x: currentViewBoxRef.current.x + currentViewBoxRef.current.width / 2,
          y: currentViewBoxRef.current.y + currentViewBoxRef.current.height / 2,
        }),
      );
    }

    function handleZoomOut() {
      clearViewportAnimation();
      applyViewBox(
        scaleViewBox(currentViewBoxRef.current, 1 / zoomStep, {
          x: currentViewBoxRef.current.x + currentViewBoxRef.current.width / 2,
          y: currentViewBoxRef.current.y + currentViewBoxRef.current.height / 2,
        }),
      );
    }

    function handleReset() {
      clearViewportAnimation();
      gestureRef.current = null;
      pointersRef.current.clear();
      movedDuringGestureRef.current = false;
      setIsDragging(false);

      const initialFeature = featureMap.get(initialZoomSlug);
      if (!initialFeature) {
        applyViewBox(initialViewBox);
        return;
      }

      const initialZoomLevel =
        window.innerWidth >= initialDesktopBreakpoint ? initialDesktopZoomLevel : initialMobileZoomLevel;

      applyViewBox(createFixedZoomFeatureViewBox(initialFeature.bounds, initialZoomLevel));
      onMunicipalityPress(initialZoomSlug);
    }

    window.addEventListener(zoomInEvent, handleZoomIn);
    window.addEventListener(zoomOutEvent, handleZoomOut);
    window.addEventListener(resetEvent, handleReset);

    return () => {
      window.removeEventListener(zoomInEvent, handleZoomIn);
      window.removeEventListener(zoomOutEvent, handleZoomOut);
      window.removeEventListener(resetEvent, handleReset);
    };
  }, [applyViewBox, clearViewportAnimation, featureMap, onMunicipalityPress]);

  function activateMunicipality(slug: string) {
    const feature = featureMap.get(slug);
    if (!feature) {
      return;
    }

    if (focusedSlug !== slug) {
      clearViewportAnimation();
      applyViewBox(createFeatureViewBox(feature.bounds));
    }

    onMunicipalityPress(slug);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    clearViewportAnimation();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const center = getSvgPoint(svg, event.clientX, event.clientY, viewBox);
    const factor = event.deltaY < 0 ? zoomStep : 1 / zoomStep;
    applyViewBox(scaleViewBox(currentViewBoxRef.current, factor, center));
  }

  function beginDrag(pointerId: number, snapshot: PointerSnapshot, startSlug: string | null) {
    gestureRef.current = {
      type: "drag",
      pointerId,
      startClientX: snapshot.clientX,
      startClientY: snapshot.clientY,
      startViewBox: viewBox,
      hasMoved: false,
      startSlug,
    };
    setIsDragging(false);
  }

  function beginPinch(svg: SVGSVGElement, entries: [number, PointerSnapshot][]) {
    const [leftEntry, rightEntry] = entries;
    const center = getCenter(leftEntry[1], rightEntry[1]);

    gestureRef.current = {
      type: "pinch",
      pointerIds: [leftEntry[0], rightEntry[0]],
      startDistance: getDistance(leftEntry[1], rightEntry[1]),
      startViewBox: viewBox,
      anchorWorld: getSvgPoint(svg, center.x, center.y, viewBox),
    };
    setIsDragging(true);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    clearViewportAnimation();

    const startSlug = getEventMunicipalitySlug(event.target);

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    movedDuringGestureRef.current = false;
    suppressClickRef.current = false;

    const entries = [...pointersRef.current.entries()];
    if (entries.length === 1) {
      beginDrag(event.pointerId, entries[0][1], startSlug);
      return;
    }

    if (entries.length >= 2) {
      beginPinch(svg, entries.slice(0, 2) as [number, PointerSnapshot][]);
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const gesture = gestureRef.current;
    const entries = [...pointersRef.current.entries()];

    if (!gesture) {
      return;
    }

    if (gesture.type === "drag") {
      const movedX = event.clientX - gesture.startClientX;
      const movedY = event.clientY - gesture.startClientY;
      const movedDistance = Math.hypot(movedX, movedY);

      if (!gesture.hasMoved && movedDistance < dragActivationPx) {
        return;
      }

      if (!gesture.hasMoved) {
        gesture.hasMoved = true;
        movedDuringGestureRef.current = true;
        suppressClickRef.current = true;
        setIsDragging(true);
      }

      const rect = svg.getBoundingClientRect();
      const deltaX = ((event.clientX - gesture.startClientX) / rect.width) * gesture.startViewBox.width;
      const deltaY = ((event.clientY - gesture.startClientY) / rect.height) * gesture.startViewBox.height;

      setViewBox(
        clampViewBox({
          ...gesture.startViewBox,
          x: gesture.startViewBox.x - deltaX,
          y: gesture.startViewBox.y - deltaY,
        }),
      );
      return;
    }

    if (entries.length < 2) {
      return;
    }

    const [leftEntry, rightEntry] = entries.slice(0, 2) as [number, PointerSnapshot][];
    const currentDistance = getDistance(leftEntry[1], rightEntry[1]);
    const currentCenter = getCenter(leftEntry[1], rightEntry[1]);
    const rect = svg.getBoundingClientRect();
    const scale = clamp(currentDistance / Math.max(gesture.startDistance, 1), 0.6, 6);
    const nextWidth = clamp(gesture.startViewBox.width / scale, minViewWidth, width);
    const nextHeight = nextWidth * aspectRatio;
    const relativeX = (currentCenter.x - rect.left) / rect.width;
    const relativeY = (currentCenter.y - rect.top) / rect.height;

    movedDuringGestureRef.current = true;
    suppressClickRef.current = true;

    setViewBox(
      clampViewBox({
        x: gesture.anchorWorld.x - relativeX * nextWidth,
        y: gesture.anchorWorld.y - relativeY * nextHeight,
        width: nextWidth,
        height: nextHeight,
      }),
    );
  }

  function finishPointerInteraction(event: PointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current;

    if (gesture?.type === "drag" && !gesture.hasMoved && gesture.startSlug) {
      activateMunicipality(gesture.startSlug);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()];

    if (remaining.length === 0) {
      gestureRef.current = null;
      setIsDragging(false);
      movedDuringGestureRef.current = false;

      return;
    }

    if (remaining.length === 1) {
      beginDrag(remaining[0][0], remaining[0][1], null);
      return;
    }

    const svg = svgRef.current;
    if (svg) {
      beginPinch(svg, remaining.slice(0, 2) as [number, PointerSnapshot][]);
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    finishPointerInteraction(event);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    finishPointerInteraction(event);
  }

  if (!geoData || !mapHelpers) {
    return (
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_24%_12%,#eef7fb_0%,#d8eaf0_34%,#b9d0d8_68%,#93adb9_100%)]">
        <div className="text-sm font-medium text-[var(--md-sys-color-on-surface-variant)] opacity-70">Indlæser kort...</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_24%_12%,#eef7fb_0%,#d8eaf0_34%,#b9d0d8_68%,#93adb9_100%)]">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`absolute inset-0 z-0 h-full w-full ${isDragging ? "cursor-grabbing" : zoomLevel > 1.02 ? "cursor-grab" : "cursor-default"}`}
        aria-label={ariaLabel}
        role="img"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: "none" }}
      >
        <rect width={width} height={height} fill="transparent" />

        {renderPathFeatures.map((feature) => {
          return (
            <path
              key={feature.slug}
              d={feature.pathData}
              fill={feature.fillColor}
              fillOpacity={feature.fillOpacity}
              stroke={feature.strokeColor}
              strokeOpacity={feature.strokeOpacity}
              strokeWidth={feature.strokeWidth}
              className="cursor-pointer transition"
              data-municipality-slug={feature.slug}
              onMouseEnter={() => setHoveredSlug(feature.slug)}
              onMouseLeave={() =>
                setHoveredSlug((current) => (current === feature.slug ? null : current))
              }
            />
          );
        })}

        <g pointerEvents="none">
          {renderOverlayFeatures.map((feature, overlayIndex) => {
            return (
              <g
                key={feature.slug + "-overlay"}
                transform={`translate(${feature.marker.x}, ${feature.marker.y}) scale(${feature.iconScale})`}
                aria-hidden="true"
              >
                {feature.hasUnreadUpdate ? (
                  <g
                    transform={`translate(${feature.updateMarkerPosition.x}, ${feature.updateMarkerPosition.y})`}
                  >
                    {feature.shouldAnimateUpdateMarker ? (
                      <circle
                        r={11}
                        fill="none"
                        stroke="rgba(249, 115, 22, 0.72)"
                        strokeWidth={2.4}
                        className="branches-map-update-pulse"
                        style={{ animationDelay: `${overlayIndex * 90}ms` }}
                      />
                    ) : null}
                    <circle r={8.2} fill="#f97316" stroke="rgba(255,255,255,0.96)" strokeWidth={2.3} />
                    <text
                      y={0.7}
                      fontSize={11}
                      fontWeight={900}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                    >
                      !
                    </text>
                  </g>
                ) : null}

                {feature.visibleIndustries.map((industry, index) => (
                  <text
                    key={feature.slug + "-" + industry.slug + "-icon"}
                    x={feature.iconPositions[index]?.x ?? 0}
                    y={feature.iconPositions[index]?.y ?? 0}
                    fontSize={feature.iconFontSize}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={feature.labelFontWeight === 700 ? 1 : 0.94}
                  >
                    {industry.icon}
                  </text>
                ))}

                {feature.uppercaseName ? (
                  <text
                    y={feature.labelY}
                    fontSize={feature.labelFontSize}
                    fontWeight={feature.labelFontWeight}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fill={feature.labelFill}
                    stroke={feature.labelStroke}
                    strokeWidth={feature.labelStrokeWidth}
                    paintOrder="stroke fill"
                    letterSpacing={0.1}
                    opacity={feature.labelOpacity}
                  >
                    {feature.uppercaseName}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
