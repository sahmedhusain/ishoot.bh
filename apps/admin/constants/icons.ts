import {
  Award, BarChart3, Briefcase, Calendar, Camera, Clapperboard, Clock, Compass, Facebook, Film, Github, Globe,
  Heart, Instagram, Link, Linkedin, Mail, MapPin, MessageCircle, Mic, Music, Phone, Radio, Send, Share2,
  Smile, Sparkles, Star, ThumbsUp, Trophy, Tv, Twitter, Users, Video, Youtube, Zap, type LucideIcon,
} from "lucide-react";

/** Icons selectable in CMS / web settings. Keys are stored in the DB, keep them stable. */
export const PICKABLE_ICONS: Record<string, LucideIcon> = {
  Instagram, Linkedin, Youtube, Facebook, Twitter, Github, Globe, Mail, Phone, MessageCircle, Send, Share2, Link,
  Video, Camera, Film, Clapperboard, Mic, Music, Tv, Radio, Sparkles, Compass, MapPin,
  Award, Trophy, Star, Heart, ThumbsUp, Smile, Users, Briefcase, Calendar, Clock, BarChart3, Zap,
};

export const POPULAR_ICON_NAMES = [
  "Instagram", "Linkedin", "Youtube", "Facebook", "Twitter", "Video", "Camera", "Film", "Globe", "Share2",
  "Phone", "Mail", "Send", "MessageCircle", "Music", "Sparkles", "Tv", "Radio", "Link", "Compass",
] as const;

export const ICON_PAGE_SIZE = 50;
