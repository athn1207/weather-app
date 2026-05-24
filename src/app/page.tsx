'use client';

import { useState } from 'react';
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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function parseDateLabel(dateStr: string, isFirst: boolean) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: isFirst ? '今日' : WEEKDAYS[d.getDay()],
    md: `${d.getMonth() + 1}/${d.getDate()}`,
  };
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

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

  const selected = weather?.forecast.forecastday.find(d => d.date === selectedDate);
  const isToday = !!weather && selectedDate === weather.forecast.forecastday[0].date;

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* タイトル */}
        <h1 className="text-4xl font-bold text-white text-center mb-8 drop-shadow-md tracking-widest">
          天気予報
        </h1>

        {/* 検索フォーム */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="都市名を入力 (例: Tokyo)"
            className="flex-1 px-4 py-3 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 text-sm transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-white text-blue-600 font-bold rounded-2xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            検索
          </button>
        </form>

        {/* 読み込み中 */}
        {loading && (
          <p className="text-white text-center py-16 text-lg font-medium animate-pulse">
            読み込み中...
          </p>
        )}

        {/* エラー */}
        {!loading && error && (
          <div className="bg-red-400/30 backdrop-blur-sm border border-red-300/40 text-white rounded-2xl p-4 text-center text-sm leading-relaxed">
            {error}
          </div>
        )}

        {/* 初期メッセージ */}
        {!loading && !weather && !error && (
          <p className="text-white/40 text-center text-sm py-10">
            都市名を入力して天気を検索しましょう
          </p>
        )}

        {/* 天気カード */}
        {!loading && weather && selected && (
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-6 shadow-2xl text-white">

            {/* 地名 */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold tracking-wide">{weather.location.name}</h2>
              <p className="text-white/60 text-xs mt-0.5">{weather.location.country}</p>
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
                  <p className="text-lg font-semibold">{Math.round(weather.current.wind_kph)}<span className="text-xs">km/h</span></p>
                </div>
              )}
            </div>

            {/* 日付セレクター（週間予報） */}
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
        )}
      </div>
    </main>
  );
}
