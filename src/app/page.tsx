'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type Condition = {
  text: string;
  icon: string;
};

type ForecastDay = {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    avgtemp_c: number;
    avghumidity: number;
    daily_chance_of_rain: number;
    condition: Condition;
  };
};

type WeatherData = {
  location: {
    name: string;
    country: string;
  };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    condition: Condition;
  };
  forecast: {
    forecastday: ForecastDay[];
  };
};

type AdviceItem = {
  icon: string;
  text: string;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const DEFAULT_FAVORITES = ['Tokyo', 'Osaka', 'London'];
const LS_KEY = 'weather-favorites';

function parseDateLabel(dateStr: string, isFirst: boolean) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: isFirst ? '今日' : WEEKDAYS[d.getDay()],
    md: `${d.getMonth() + 1}/${d.getDate()}`,
  };
}

function getAdvice(day: ForecastDay['day']): AdviceItem[] {
  const advice: AdviceItem[] = [];
  const { maxtemp_c, daily_chance_of_rain } = day;

  if (maxtemp_c < 10) {
    advice.push({ icon: '🧥', text: '防寒対策をしっかりと。厚手のコートや手袋・マフラーが必要です' });
  } else if (maxtemp_c < 15) {
    advice.push({ icon: '🧥', text: '厚手のコートやダウンジャケットが必要です' });
  } else if (maxtemp_c < 22) {
    advice.push({ icon: '🧣', text: 'シャツに薄手のジャケットやカーディガンがおすすめです' });
  } else if (maxtemp_c < 25) {
    advice.push({ icon: '👕', text: '長袖シャツが快適です。薄手の羽織るものがあると安心です' });
  } else {
    advice.push({ icon: '🌞', text: '半袖で快適に過ごせます。日焼け止めも忘れずに' });
  }

  if (daily_chance_of_rain >= 50) {
    advice.push({ icon: '☂️', text: '傘を忘れずに持っていきましょう' });
  } else if (daily_chance_of_rain >= 30) {
    advice.push({ icon: '🌂', text: '折りたたみ傘があると安心です' });
  }

  if (maxtemp_c >= 30) {
    advice.push({ icon: '💧', text: 'こまめな水分補給を心がけましょう' });
  }

  return advice;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavorites(parsed);
        }
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(favorites));
  }, [favorites]);

  async function fetchWeather(city: string) {
    if (!city.trim()) return;
    setLoading(true);
    setError('');
    setWeather(null);
    try {
      const key = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${encodeURIComponent(city)}&days=7&aqi=no&alerts=no&lang=ja`
      );
      if (!res.ok) throw new Error('都市が見つかりませんでした。英語の都市名で試してください。');
      const data: WeatherData = await res.json();
      setWeather(data);
      setSelectedDate(data.forecast.forecastday[0].date);
    } catch (e) {
      setError(e instanceof Error ? e.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchWeather(query);
  }

  function handleGPS() {
    if (!navigator.geolocation) {
      setError('このブラウザはGeolocationに対応していません');
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsLoading(false);
        fetchWeather(`${latitude.toFixed(2)},${longitude.toFixed(2)}`);
      },
      () => {
        setGpsLoading(false);
        setError('現在地の取得に失敗しました。位置情報の許可を確認してください。');
      }
    );
  }

  function toggleFavorite() {
    if (!weather) return;
    const cityName = weather.location.name;
    setFavorites(prev =>
      prev.includes(cityName) ? prev.filter(c => c !== cityName) : [...prev, cityName]
    );
  }

  const isFavorite = weather ? favorites.includes(weather.location.name) : false;
  const selected = weather?.forecast.forecastday.find(d => d.date === selectedDate);
  const isToday = !!weather && selectedDate === weather.forecast.forecastday[0].date;
  const advice = selected ? getAdvice(selected.day) : [];
  const isAnyLoading = loading || gpsLoading;

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 flex items-start justify-center p-4 pt-10 pb-12">
      <div className="w-full max-w-sm">

        {/* タイトル */}
        <h1 className="text-4xl font-bold text-white text-center mb-6 drop-shadow-md tracking-widest">
          天気予報
        </h1>

        {/* 検索フォーム */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="都市名を入力 (例: Tokyo)"
            className="flex-1 px-4 py-3 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 text-sm transition"
          />
          <button
            type="submit"
            disabled={isAnyLoading}
            className="px-5 py-3 bg-white text-blue-600 font-bold rounded-2xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            検索
          </button>
        </form>

        {/* GPS ボタン */}
        <button
          onClick={handleGPS}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 bg-white/15 backdrop-blur-sm border border-white/30 text-white rounded-2xl hover:bg-white/25 active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
        >
          <span className="text-base">{gpsLoading ? '📡' : '📍'}</span>
          <span>{gpsLoading ? '現在地を取得中...' : '現在地の天気を見る'}</span>
        </button>

        {/* お気に入りタブ */}
        {favorites.length > 0 && (
          <div className="mb-5">
            <p className="text-white/50 text-xs mb-2 text-center tracking-wide">⭐ お気に入りの都市</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {favorites.map(city => {
                const isActive = weather?.location.name === city;
                return (
                  <button
                    key={city}
                    onClick={() => fetchWeather(city)}
                    disabled={isAnyLoading}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-md scale-105'
                        : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 読み込み中 */}
        {isAnyLoading && (
          <p className="text-white text-center py-16 text-lg font-medium animate-pulse">
            読み込み中...
          </p>
        )}

        {/* エラー */}
        {!isAnyLoading && error && (
          <div className="bg-red-400/30 backdrop-blur-sm border border-red-300/40 text-white rounded-2xl p-4 text-center text-sm leading-relaxed">
            {error}
          </div>
        )}

        {/* 初期メッセージ */}
        {!isAnyLoading && !weather && !error && (
          <p className="text-white/40 text-center text-sm py-6">
            都市名を入力するか、現在地から天気を検索しましょう
          </p>
        )}

        {/* 天気カード */}
        {!isAnyLoading && weather && selected && (
          <>
            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-6 shadow-2xl text-white">

              {/* 地名 + お気に入りボタン */}
              <div className="text-center mb-4 relative">
                <h2 className="text-2xl font-bold tracking-wide">{weather.location.name}</h2>
                <p className="text-white/60 text-xs mt-0.5">{weather.location.country}</p>
                <button
                  onClick={toggleFavorite}
                  className="absolute right-0 top-0 text-2xl transition-transform active:scale-90 hover:scale-110 leading-none"
                  title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                >
                  {isFavorite ? '⭐' : '☆'}
                </button>
              </div>

              {/* メイン天気表示 */}
              <div className="flex flex-col items-center mb-5">
                <Image
                  src={`https:${selected.day.condition.icon}`}
                  alt={selected.day.condition.text}
                  width={80}
                  height={80}
                  className="drop-shadow-lg"
                  unoptimized
                />
                <p className="text-6xl font-thin mt-1 tabular-nums">
                  {isToday
                    ? Math.round(weather.current.temp_c)
                    : Math.round(selected.day.avgtemp_c)}
                  <span className="text-3xl align-super ml-1">°C</span>
                </p>
                <p className="text-white/80 text-sm mt-2">{selected.day.condition.text}</p>
                {!isToday && (
                  <p className="text-white/50 text-xs mt-1">
                    最高 {Math.round(selected.day.maxtemp_c)}° / 最低 {Math.round(selected.day.mintemp_c)}°
                  </p>
                )}
              </div>

              {/* 詳細データ */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-white/50 text-xs mb-1">🌧 降水確率</p>
                  <p className="text-xl font-semibold">{selected.day.daily_chance_of_rain}%</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-white/50 text-xs mb-1">💧 湿度</p>
                  <p className="text-xl font-semibold">
                    {isToday ? weather.current.humidity : selected.day.avghumidity}%
                  </p>
                </div>
                {isToday ? (
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-white/50 text-xs mb-1">🌡 体感</p>
                    <p className="text-xl font-semibold">{Math.round(weather.current.feelslike_c)}°</p>
                  </div>
                ) : (
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-white/50 text-xs mb-1">🌬 風速</p>
                    <p className="text-lg font-semibold">
                      {Math.round(weather.current.wind_kph)}<span className="text-xs">km/h</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 週間予報 */}
              <div>
                <p className="text-white/50 text-xs text-center mb-2">週間予報</p>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {weather.forecast.forecastday.map((day, i) => {
                    const { weekday, md } = parseDateLabel(day.date, i === 0);
                    const isSelected = day.date === selectedDate;
                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={`flex-shrink-0 flex flex-col items-center px-2 py-2 rounded-2xl transition-all duration-200 min-w-[52px] ${
                          isSelected
                            ? 'bg-white text-blue-600 shadow-lg scale-105'
                            : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
                        }`}
                      >
                        <span className={`text-xs font-semibold ${isSelected ? 'text-blue-500' : 'text-white/80'}`}>
                          {weekday}
                        </span>
                        <span className={`text-[10px] mb-0.5 ${isSelected ? 'text-blue-400' : 'text-white/50'}`}>
                          {md}
                        </span>
                        <Image
                          src={`https:${day.day.condition.icon}`}
                          alt={day.day.condition.text}
                          width={32}
                          height={32}
                          unoptimized
                        />
                        <span className="text-xs font-bold mt-0.5">
                          {Math.round(day.day.avgtemp_c)}°
                        </span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-400' : 'text-white/50'}`}>
                          {day.day.daily_chance_of_rain}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* アドバイスカード */}
            <div className="mt-4 bg-white/15 backdrop-blur-md border border-white/25 rounded-3xl p-5 shadow-xl text-white">
              <p className="text-white/70 text-xs font-semibold text-center mb-3 tracking-widest uppercase">
                👗 今日のアドバイス
              </p>
              <div className="space-y-2">
                {advice.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <p className="text-sm leading-snug text-white/90">{item.text}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-[11px] text-center mt-3">
                最高 {Math.round(selected.day.maxtemp_c)}° / 最低 {Math.round(selected.day.mintemp_c)}°　·　降水確率 {selected.day.daily_chance_of_rain}%
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
