import { useState, useEffect, useCallback } from 'react';
import {api} from '../lib/api';
import {
  ArenaConfig,
  Club,
  LineupConfig,
  MatchReport,
  Player,
  Race,
  TacticsConfig,
  TipsetMatch,
  TrainableAttribute,
} from '../types';

export interface WorldInfo {
  season: number;
  round: number;
  day: number;
  totalMatchesPlayed: number;
}

export interface GameState {
  isLoading: boolean;
  hasClub: boolean;
  userId: string;
  world: WorldInfo;
  currentTab: string;
  selectedPlayerId: number | null;
  selectedMatchId: string | null;
  club: Club;
  players: Player[];
  divisionStandings: Club[];
  matchesHistory: MatchReport[];
  tipsetMatches: TipsetMatch[];
  shoutboxMessages: Array<{ id?: number; user: string; time: string; text: string }>;
}

const DEFAULT_TACTICS: TacticsConfig = {
  uppspel: 'Normal',
  spelvag: 'Normal',
  skytte: 'Normal',
};

const DEFAULT_TRAINING_POINTS: Record<TrainableAttribute, number> = {
  snabbhet: 1,
  kondition: 1,
  markering: 1,
  passning: 1,
  teknik: 1,
  speluppfattning: 1,
  skott: 0,
  malvakt: 0,
  tuffhet: 0,
};

const DUMMY_FALLBACK_CLUB: Club = {
  id: 'pending-club',
  name: 'Mambenna Fäste',
  shortName: 'Fäste',
  race: 'human',
  hometown: 'Berunia',
  division: 'Division 3:1',
  position: 10,
  merit: 0,
  gold: 200000,
  presentation: '',
  ownerName: 'Manager',
  ownerEmail: '',
  marathonPoints: 0,
  recordString: '0/0/0',
  wins: 0,
  draws: 0,
  losses: 0,
  coach: null,
  arena: null,
  doctorInvestment: 1000,
  magicInvestment: 0,
  trainingPoints: DEFAULT_TRAINING_POINTS,
  lineup: {
    slots: {},
    underlag: 'Gräs',
    intrade: 8,
    tactics: DEFAULT_TACTICS,
  },
};

const INITIAL_TIPSET_MATCHES: TipsetMatch[] = [];

function getOrCreateUserId(): string {
  let uid = localStorage.getItem('mambenna_user_id');
  if (!uid) {
    uid = 'usr_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('mambenna_user_id', uid);
  }
  return uid;
}

export function useGameStore() {
  const [userId] = useState<string>(() => getOrCreateUserId());
  const [state, setState] = useState<GameState>({
    isLoading: true,
    hasClub: false,
    userId,
    world: { season: 1, round: 0, day: 0, totalMatchesPlayed: 0 },
    currentTab: 'lag',
    selectedPlayerId: null,
    selectedMatchId: null,
    club: DUMMY_FALLBACK_CLUB,
    players: [],
    divisionStandings: [],
    matchesHistory: [],
    tipsetMatches: INITIAL_TIPSET_MATCHES,
    shoutboxMessages: [],
  });

  // Fetch Authoritative Data from Cloud SQL backend
  const fetchClubAndWorld = useCallback(async () => {
    try {
      const [worldRes, clubRes, shoutRes] = await Promise.all([
        fetch('/api/world'),
        fetch(`/api/user/${userId}/club`),
        fetch('/api/shoutbox'),
      ]);

      const worldData = await worldRes.json();
      const clubData = await clubRes.json();
      const shoutData = await shoutRes.json();

      let divisionClubs: Club[] = [];
      let matchesHistory: MatchReport[] = [];

      if (clubData.hasClub && clubData.club) {
        const [standingsRes, matchesRes] = await Promise.all([
          fetch(`/api/divisions/${encodeURIComponent(clubData.club.division)}/standings`),
          fetch(`/api/clubs/${clubData.club.id}/matches`),
        ]);
        divisionClubs = await standingsRes.json();
        const rawMatches = await matchesRes.json();
        matchesHistory = rawMatches.map((m: any) => m.matchReport);
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        world: worldData,
        hasClub: clubData.hasClub,
        club: clubData.hasClub ? clubData.club : prev.club,
        players: clubData.hasClub ? clubData.players : [],
        divisionStandings: divisionClubs,
        matchesHistory,
        selectedMatchId: matchesHistory[0]?.id || null,
        shoutboxMessages: (shoutData || []).map((m: any) => {
          const date = new Date(m.createdAt || Date.now());
          const time = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}).format(date);
          return {
            id: m.id,
            user: m.authorName,
            time,
            text: m.content,
          };
        }),
      }));
    } catch (err) {
      console.error('Failed to synchronize with Cloud SQL server:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchClubAndWorld();
  }, [fetchClubAndWorld]);

  useEffect(()=>{let alive=true;const poll=async()=>{try{const response=await fetch('/api/shoutbox');if(!response.ok)return;const messages=await response.json();if(alive)setState(prev=>({...prev,shoutboxMessages:messages.map((m:any)=>({id:m.id,user:m.authorName,text:m.content,time:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}).format(new Date(m.createdAt))}))}));}catch{}};const timer=setInterval(poll,5000);return()=>{alive=false;clearInterval(timer)}},[]);
  const setTab = useCallback((tab: string) => {
    setState((prev) => ({ ...prev, currentTab: tab }));
  }, []);

  const selectPlayer = useCallback((id: number | null) => {
    setState((prev) => ({ ...prev, selectedPlayerId: id }));
  }, []);

  const selectMatch = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedMatchId: id }));
  }, []);

  // Onboarding / Club Creation in Season 1
  const createNewClub = useCallback(
    async (clubName: string, shortName: string, race: Race, managerName: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const res = await fetch('/api/clubs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            managerName,
            clubName,
            shortName,
            race,
          }),
        });
        const created = await res.json();
        if (created.club) {
          await fetchClubAndWorld();
          setState((prev) => ({
            ...prev,
            currentTab: 'lag',
            selectedPlayerId: null,
          }));
        }
      } catch (err) {
        console.error('Failed to create club on server:', err);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [userId, fetchClubAndWorld]
  );

  const updatePresentation=useCallback(async(presentation:string)=>{await api('/clubs/'+state.club.id+'/presentation',{presentation});await fetchClubAndWorld()},[state.club.id,fetchClubAndWorld]);
  const saveLineup=useCallback(async(lineup:LineupConfig)=>{await api('/clubs/'+state.club.id+'/lineup',{lineup});await fetchClubAndWorld()},[state.club.id,fetchClubAndWorld]);
  const saveTraining=useCallback(async(trainingPoints:Record<TrainableAttribute,number>)=>{await api('/clubs/'+state.club.id+'/training',{trainingPoints});await fetchClubAndWorld()},[state.club.id,fetchClubAndWorld]);
  const updateDoctorCost=useCallback(async(doctorInvestment:number)=>{await api('/clubs/'+state.club.id+'/doctor',{doctorInvestment});await fetchClubAndWorld()},[state.club.id,fetchClubAndWorld]);
  const saveArena=useCallback(async(arena:ArenaConfig)=>{await api('/clubs/'+state.club.id+'/arena',{arena,cost:arena.cost});await fetchClubAndWorld()},[state.club.id,fetchClubAndWorld]);

  // Tipset submission
  const submitTipset = useCallback(
    async (predictions: Record<number, '1' | 'X' | '2'>) => {
      setState((prev) => ({
        ...prev,
        tipsetMatches: prev.tipsetMatches.map((m) => ({
          ...m,
          userPrediction: predictions[m.id] || m.userPrediction,
        })),
      }));
      if (state.club?.id) {
        await fetch('/api/tipset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clubId: state.club.id,
            season: state.world.season,
            round: state.world.round || 1,
            predictions,
          }),
        });
      }
    },
    [state.club?.id, state.world]
  );

  // Shoutbox
  const addShoutboxMessage = useCallback(
    async (text: string) => {
      const response=await fetch('/api/shoutbox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:text})});
      const message=await response.json();
      if(!response.ok)throw new Error(message.error||'Meddelandet kunde inte skickas.');
      setState(prev=>({...prev,shoutboxMessages:[...prev.shoutboxMessages.filter(m=>m.id!==message.id),{id:message.id,user:message.authorName,text:message.content,time:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}).format(new Date(message.createdAt))}].slice(-500)}));
    },
    [state.club?.ownerName, userId]
  );

  // Authoritative Match Simulation in Season 1
  const simulateMatchAgainstBot = useCallback(async () => {
    if (!state.club?.id) return;
    try {
      const res = await fetch('/api/matches/simulate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userClubId: state.club.id }),
      });
      const data = await res.json();
      if (data.matchReport) {
        setState((prev) => ({
          ...prev,
          club: data.updatedClub || prev.club,
          players: data.updatedPlayers || prev.players,
          matchesHistory: [data.matchReport, ...prev.matchesHistory],
          selectedMatchId: data.matchReport.id,
        }));
      }
    } catch (err) {
      console.error('Failed to simulate match:', err);
    }
  }, [state.club?.id]);

  // World Reset tool (for admin/testing)
  const resetWorldToDay0 = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      await fetch('/api/admin/reset-world', { method: 'POST' });
      await fetchClubAndWorld();
    } catch (err) {
      console.error('Failed to reset world:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [fetchClubAndWorld]);

  return {
    state,
    setTab,
    selectPlayer,
    selectMatch,
    updatePresentation,
    saveLineup,
    saveTraining,
    updateDoctorCost,
    saveArena,
    submitTipset,
    addShoutboxMessage,
    simulateMatchAgainstBot,
    createNewClub,
    resetWorldToDay0,
    refetch: fetchClubAndWorld,
  };
}
