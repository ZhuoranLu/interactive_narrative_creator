export interface TemplateElement {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    background?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
    color?: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: string;
    borderStyle?: string;
  };
  content?: string;
}

export interface GameTemplate {
  game_info: {
    title: string;
    description: string;
    style: string;
  };
  assets: {
    characters: Record<string, any>;
    backgrounds: Record<string, any>;
  };
  game_scenes: Array<{
    scene_id: string;
    scene_title: string;
    background_image?: string;
    background_music?: string;
    content_sequence: Array<{
      type: string;
      text: string;
      speaker: string;
      display_duration?: number;
      character_image?: string;
    }>;
    player_choices?: Array<{
      choice_id: string;
      choice_text: string;
      choice_type: string;
      target_scene_id?: string;
      immediate_response?: string;
      effects?: {
        world_state_changes?: string;
      };
    }>;
  }>;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  content: string;
  speaker: string;
  duration: number;
  order: number;
  sceneId?: string;
  choices?: any[];
} 