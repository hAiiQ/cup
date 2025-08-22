"use strict";(()=>{var e={};e.id=5467,e.ids=[5467],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4770:e=>{e.exports=require("crypto")},2399:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>L,patchFetch:()=>N,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>l,staticGenerationAsyncStorage:()=>c});var T={};t.r(T),t.d(T,{POST:()=>A,dynamic:()=>d});var r=t(9303),i=t(8716),s=t(670),E=t(7070),n=t(728),o=t(8691);let d="force-dynamic";async function A(e){try{console.log("\uD83D\uDD04 Starting database initialization..."),await n._.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "inGameName" TEXT,
        "inGameRank" TEXT,
        "discordName" TEXT,
        "twitchName" TEXT,
        "instagramName" TEXT,
        tier TEXT,
        "isStreamer" BOOLEAN DEFAULT false,
        "isVerified" BOOLEAN DEFAULT false,
        "rulesAccepted" BOOLEAN DEFAULT false,
        "twitchVerified" BOOLEAN DEFAULT false,
        "instagramVerified" BOOLEAN DEFAULT false,
        "discordVerified" BOOLEAN DEFAULT false,
        "teamId" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,await n._.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Team" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT UNIQUE NOT NULL,
        "isLive" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,await n._.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Admin" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,await n._.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Match" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        round TEXT NOT NULL,
        "bracketType" TEXT NOT NULL,
        "homeTeamId" TEXT,
        "awayTeamId" TEXT,
        "winnerId" TEXT,
        "isCompleted" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round, "bracketType")
      );
    `,console.log("✅ All tables created!");let e=await o.ZP.hash("admin123",10);for(let a of(await n._.$executeRaw`
      INSERT INTO "Admin" (id, username, password) 
      VALUES (gen_random_uuid()::text, 'admin', ${e})
      ON CONFLICT (username) DO UPDATE SET password = ${e};
    `,console.log("✅ Admin user created"),["Team Alpha","Team Beta","Team Gamma","Team Delta","Team Epsilon","Team Zeta","Team Eta","Team Theta"]))await n._.$executeRaw`
        INSERT INTO "Team" (id, name) 
        VALUES (gen_random_uuid()::text, ${a})
        ON CONFLICT (name) DO NOTHING;
      `;return console.log("✅ Teams created"),E.NextResponse.json({success:!0,message:"\uD83C\uDF89 Database initialization complete!"})}catch(e){return console.error("❌ Database initialization failed:",e),E.NextResponse.json({success:!1,error:e instanceof Error?e.message:"Unknown error occurred"},{status:500})}}let u=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/init-database/route",pathname:"/api/init-database",filename:"route",bundlePath:"app/api/init-database/route"},resolvedPagePath:"C:\\Users\\hAiQ\\Desktop\\cup\\src\\app\\api\\init-database\\route.ts",nextConfigOutput:"",userland:T}),{requestAsyncStorage:m,staticGenerationAsyncStorage:c,serverHooks:l}=u,L="/api/init-database/route";function N(){return(0,s.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:c})}},728:(e,a,t)=>{t.d(a,{_:()=>i});let T=require("@prisma/client"),r=globalThis;process.env.DATABASE_URL||(console.error("❌ DATABASE_URL environment variable is not set!"),console.log("\uD83D\uDD27 Please set DATABASE_URL in your Render environment variables"));let i=r.prisma??new T.PrismaClient({})}};var a=require("../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),T=a.X(0,[8948,5972,8691],()=>t(2399));module.exports=T})();