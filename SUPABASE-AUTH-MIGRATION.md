# Flash Movie — Supabase Auth setup

Website login form ကို မူလအတိုင်း **username + password** ပုံစံထားပါတယ်။ Supabase Auth က အတွင်းပိုင်းတွင် email identity တစ်ခုလိုအပ်သောကြောင့် code က `username@accounts.flashmovie.invalid` ကို အကောင့်တစ်ခုချင်းစီအတွက် အတွင်းသုံးအဖြစ်ဖန်တီးပါတယ်။ အသုံးပြုသူက email မထည့်ရပါ၊ အဲဒီ address တွေကို email ပို့လို့လည်းမရပါ။

## တစ်ကြိမ်သာလုပ်ရမည့် setup

1. Supabase project ကို backup လုပ်ပြီး [SQL Editor](https://supabase.com/dashboard/project/xlityagwhcpkloiyvlpo/sql/new) ကိုဖွင့်ပါ။
2. `supabase-auth-migration.sql` ဖိုင်၏ နောက်ဆုံး version အားလုံးကို SQL Editor ထဲ paste လုပ်ပြီး run လုပ်ပါ။ အရင် version ကို run လုပ်ပြီးသားဖြစ်လည်း နောက်ဆုံး file ကို ထပ် run လုပ်ပါ။ Table/function ပြင်ဆင်ချက်များ ထည့်သွင်းပြီး schema cache ကို refresh လုပ်ပေးပါမည်။
3. **Authentication → Providers → Email** မှ Email provider နှင့် sign-up ကို enable လုပ်ပါ။ **Confirm email ကို OFF** လုပ်ပါ—username identity များတွင် inbox မရှိပါ။
4. Website ဖိုင်အသစ်များကို hosting ပေါ်တင်ပါ။ Login modal မှ migration သတိပေးချက် ပျောက်သွားရပါမည်။
5. ပထမဆုံး admin ကို website မှ username/password ဖြင့် register လုပ်ပါ။ ထို့နောက် SQL Editor ထဲက `YOUR_ADMIN_USERNAME` နေရာတွင် အဲဒီ admin username ကိုရေးပြီး အောက်ပါ query ကို run လုပ်ပါ။

```sql
update public.profiles
set role = 'admin', status = 'approved'
where username = lower('YOUR_ADMIN_USERNAME');
```

Admin role ကို browser မှ ပေးလို့မရပါ။ Project owner ကသာ SQL Editor ဖြင့် ပထမဆုံး admin ကို သတ်မှတ်နိုင်ပါတယ်။ ထို့နောက် အဲဒီ username/password နဲ့ဝင်ပြီး Admin Panel ကိုဖွင့်ပါ။

## အသုံးပြုသူအတွက် ပြောင်းလဲမှု

- Login နှင့် register တွင် username/password ပဲလိုသည်။ Email field မရှိပါ။
- Supabase Auth က password ကို hash လုပ်ပြီး session ကိုစီမံသည်။ Website က `localStorage` ထဲ password မသိမ်းပါ။
- အကောင့်အသစ်များသည် `pending` ဖြစ်ပြီး admin အတည်ပြုပြီးမှ ဝင်သုံးနိုင်သည်။
- Device limit request ကို username ဖြင့်ပို့နိုင်ပြီး email မလိုပါ။ ကြာနေပါက `@ckstore22` Telegram link ကိုအသုံးပြုနိုင်ပါတယ်။
- Admin က account များကို approve လုပ်နိုင်ပြီး request မှတစ်ဆင့်ဖြစ်စေ Device ID ကိုကိုယ်တိုင်ထည့်၍ဖြစ်စေ limit သတ်မှတ်နိုင်သည်။
- Email မသုံးသည့်အတွက် password reset ကို ကိုယ်တိုင်မလုပ်နိုင်ပါ။ Password မေ့ပါက `@ckstore22` မှတစ်ဆင့် admin ကိုဆက်သွယ်ပါ။
- Migration အသင့်ဖြစ်ကြောင်း website ကစစ်ပြီးမှသာ ယခင် `flash_users` plaintext password list ကိုဖယ်ရှားသည်။ Username/display name/follow preference ကဲ့သို့ password မဟုတ်သောအချက်အလက်များကိုသာ ခဏသိမ်းပြီး username ပြန်သုံးရာတွင်ကူညီသည်။ ယခင် password များကို Supabase Auth သို့ အလိုအလျောက်မရွှေ့နိုင်သောကြောင့် account များကို username တူဖြင့် ပြန်ဖွင့်ရပါမည်။

## ကန့်သတ်ချက်နှင့် သတိပြုရန်

- Repository ထဲရှိ Supabase key သည် browser client အတွက် **publishable key** ဖြစ်ပြီး database admin ခွင့်မရှိပါ။ SQL migration ကို project owner က SQL Editor မှ run ရပါမည်။
- Device ID သည် browser storage/cookie ကို reset သို့မဟုတ် spoof လုပ်နိုင်သည့်တန်ဖိုးဖြစ်သည်။ Database က ထို ID အတွက် count/limit ကို server-side စစ်သော်လည်း physical device ကို cryptographically သက်သေပြခြင်းမဟုတ်ပါ။
- ယခင် `contents`, `messages`, `storage` tables ၏ public policies ကို ဤ Auth migration က မပြောင်းပါ။ ထို policies များကို သီးခြား security review လုပ်ရန်လိုသည်။
- Application content ကို Supabase သို့မရွှေ့ပါ။ ယခင် IndexedDB/localStorage content သည် browser အတွင်းမှာပဲရှိနေမည်။
