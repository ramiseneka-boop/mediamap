'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ─── TYPES ──────────────────────────────────────────────────────────
type Tab = 'hashtags' | 'content' | 'calendar' | 'calculator' | 'leads'

// ─── HASHTAG DATABASE ───────────────────────────────────────────────
const NICHES: Record<string, { label: string; hashtags: { high: string[]; mid: string[]; low: string[] } }> = {
  restaurants: {
    label: 'Рестораны и кафе',
    hashtags: {
      high: ['#алматы', '#астана', '#казахстан', '#еда', '#ресторан', '#кафе', '#вкусно', '#food', '#foodie', '#instafood'],
      mid: ['#ресторанказахстан', '#кафеалматы', '#кафеастана', '#кухняказахстана', '#казахскаякухня', '#вкусноиточка', '#едаалматы', '#обедалматы', '#ужиналматы', '#доставкаеды'],
      low: ['#лучшийресторан', '#бизнесланчалматы', '#ресторанастана', '#новоеменю', '#шефповар', '#банкетныйзал', '#романтическийужин', '#завтракалматы', '#бранчалматы', '#гастрономия'],
    },
  },
  beauty: {
    label: 'Салоны красоты',
    hashtags: {
      high: ['#красота', '#салонкрасоты', '#маникюр', '#педикюр', '#волосы', '#стилист', '#beauty', '#makeup', '#nails', '#hair'],
      mid: ['#салонкрасотыалматы', '#салонкрасотыастана', '#маникюралматы', '#парикмахералматы', '#косметологалматы', '#бровиалматы', '#наращиваниересниц', '#окрашиваниеволос', '#стрижкаалматы', '#уходзаволосами'],
      low: ['#кератиналматы', '#ботокскзволос', '#балаяжалматы', '#шатушалматы', '#аппаратныйманикюр', '#комбиманикюр', '#косметологияалматы', '#чисткалица', '#пилингалматы', '#лазернаяэпиляция'],
    },
  },
  fitness: {
    label: 'Фитнес и спорт',
    hashtags: {
      high: ['#фитнес', '#спорт', '#тренировка', '#зож', '#fitness', '#gym', '#workout', '#мотивация', '#здоровье', '#спортзал'],
      mid: ['#фитнесалматы', '#фитнесастана', '#тренералматы', '#йогаалматы', '#кроссфиталматы', '#бокскз', '#пилатесалматы', '#стретчинг', '#фитнесклуб', '#персональныйтренер'],
      low: ['#групповыетренировки', '#фитнесмарафон', '#похудениеалматы', '#сушкатела', '#набормассы', '#правильноепитание', '#пп', '#здоровыйобразжизни', '#утренняятренировка', '#домашнийфитнес'],
    },
  },
  medicine: {
    label: 'Медицина и клиники',
    hashtags: {
      high: ['#здоровье', '#медицина', '#врач', '#клиника', '#доктор', '#лечение', '#health', '#стоматолог', '#стоматология', '#зубы'],
      mid: ['#клиникаалматы', '#клиникаастана', '#стоматологалматы', '#педиатралматы', '#гинекологалматы', '#урологалматы', '#дерматологалматы', '#лоралматы', '#офтальмологалматы', '#кардиологалматы'],
      low: ['#имплантациязубов', '#виниры', '#брекетыалматы', '#узиалматы', '#анализыалматы', '#мрталматы', '#checkup', '#профосмотр', '#семейнаяклиника', '#детскийврач'],
    },
  },
  education: {
    label: 'Образование',
    hashtags: {
      high: ['#образование', '#обучение', '#курсы', '#школа', '#учеба', '#education', '#study', '#знания', '#развитие', '#дети'],
      mid: ['#курсыалматы', '#курсыастана', '#английскийалматы', '#программирование', '#itкурсы', '#подготовкакшколе', '#репетиторалматы', '#детскийцентр', '#развивающиезанятия', '#ieltsалматы'],
      low: ['#робототехника', '#шахматыдлядетей', '#рисованиеалматы', '#танцыдлядетей', '#музыкальнаяшкола', '#логопедалматы', '#ментальнаяарифметика', '#скорочтение', '#подготовкакент', '#репетиторматематика'],
    },
  },
  realestate: {
    label: 'Недвижимость',
    hashtags: {
      high: ['#недвижимость', '#квартира', '#дом', '#аренда', '#продажа', '#жилье', '#realestate', '#ипотека', '#новостройка', '#ремонт'],
      mid: ['#недвижимостьалматы', '#недвижимостьастана', '#квартираалматы', '#новостройкаалматы', '#арендаалматы', '#риэлторалматы', '#жкалматы', '#купитьквартиру', '#ипотекаказахстан', '#элитнаянедвижимость'],
      low: ['#однокомнатная', '#двухкомнатная', '#студияалматы', '#таунхаус', '#пентхаус', '#коммерческаянедвижимость', '#офисалматы', '#помещениеподбизнес', '#инвестициивнедвижимость', '#жкастана'],
    },
  },
  auto: {
    label: 'Авто',
    hashtags: {
      high: ['#авто', '#машина', '#автомобиль', '#car', '#cars', '#тачка', '#drive', '#автосервис', '#ремонтавто', '#казахстан'],
      mid: ['#автоалматы', '#автоастана', '#автосервисалматы', '#запчастиалматы', '#шиномонтаж', '#покраскаавто', '#автомойка', '#полировка', '#тонировка', '#автопрокат'],
      low: ['#кузовнойремонт', '#двигатель', '#акпп', '#диагностикаавто', '#автоэлектрик', '#развалсхождение', '#автозвук', '#тюнингалматы', '#выкупавто', '#автоподбор'],
    },
  },
  fashion: {
    label: 'Одежда и мода',
    hashtags: {
      high: ['#мода', '#стиль', '#одежда', '#fashion', '#style', '#outfit', '#шоурум', '#платье', '#обувь', '#аксессуары'],
      mid: ['#шоурумалматы', '#шоурумастана', '#женскаяодежда', '#мужскаяодежда', '#брендоваяодежда', '#казахстанскийбренд', '#дизайнеркз', '#модаказахстан', '#стильныйобраз', '#капсульныйгардероб'],
      low: ['#вечернееплатье', '#костюмалматы', '#пальтоалматы', '#сумкиалматы', '#ювелирныеукрашения', '#бижутерия', '#кроссовки', '#спортивнаяодежда', '#детскаяодежда', '#свадебноеплатье'],
    },
  },
  hotel: {
    label: 'Отели и туризм',
    hashtags: {
      high: ['#путешествия', '#отдых', '#туризм', '#travel', '#hotel', '#отель', '#казахстан', '#природа', '#горы', '#tourism'],
      mid: ['#отельалматы', '#отельастана', '#туризмказахстан', '#горыказахстана', '#чарынскийканьон', '#кольсайскиеозера', '#бурабай', '#алаколь', '#капчагай', '#медеу'],
      low: ['#глэмпинг', '#юртакемп', '#горнолыжный', '#шымбулак', '#туртранссиб', '#экотуризм', '#конныйтур', '#джиптур', '#рыбалкакз', '#охотакз'],
    },
  },
  it: {
    label: 'IT и стартапы',
    hashtags: {
      high: ['#it', '#технологии', '#стартап', '#бизнес', '#разработка', '#программирование', '#tech', '#startup', '#digital', '#marketing'],
      mid: ['#itkазахстан', '#стартапкз', '#вебразработка', '#мобильноеприложение', '#seo', '#smm', '#таргет', '#контекстнаяреклама', '#digitalкз', '#маркетингалматы'],
      low: ['#uxui', '#дизайнинтерфейсов', '#pythonkz', '#javakz', '#astanaithub', '#techgarden', '#иннополис', '#блокчейн', '#ai', '#нейросети'],
    },
  },
  kids: {
    label: 'Детские товары и услуги',
    hashtags: {
      high: ['#дети', '#ребенок', '#мама', '#детскийсад', '#игрушки', '#kids', '#baby', '#детскаяодежда', '#развитие', '#материнство'],
      mid: ['#детиалматы', '#детскийсадалматы', '#детскийцентралматы', '#детскийденьрождения', '#аниматоры', '#батутныйцентр', '#детскаяплощадка', '#развлечениядлядетей', '#мамыалматы', '#мамыастана'],
      low: ['#детскаямебель', '#коляска', '#автокресло', '#детскоепитание', '#слингалматы', '#монтессори', '#раннееразвитие', '#логопедкз', '#няняалматы', '#бебиситтер'],
    },
  },
  construction: {
    label: 'Строительство и ремонт',
    hashtags: {
      high: ['#ремонт', '#строительство', '#дизайн', '#интерьер', '#дом', '#квартира', '#interior', '#design', '#мебель', '#декор'],
      mid: ['#ремонталматы', '#ремонтастана', '#дизайнинтерьера', '#ремонтквартир', '#строительстводомов', '#мебельназаказ', '#кухниназаказ', '#шкафкупе', '#плитка', '#ламинат'],
      low: ['#сантехникалматы', '#электрикалматы', '#натяжныепотолки', '#кондиционеры', '#теплыйпол', '#ворота', '#забор', '#ландшафтныйдизайн', '#умныйдом', '#видеонаблюдение'],
    },
  },
  wedding: {
    label: 'Свадьбы и тои',
    hashtags: {
      high: ['#свадьба', '#той', '#wedding', '#невеста', '#жених', '#торжество', '#банкет', '#праздник', '#тамада', '#ведущий'],
      mid: ['#свадьбаалматы', '#свадьбаастана', '#тойхана', '#ведущийалматы', '#фотографалматы', '#видеографалматы', '#свадебныйторт', '#свадебноеплатье', '#свадебныйбукет', '#свадебныйдекор'],
      low: ['#кызузату', '#бесикке', '#тусаукесер', '#тойбастар', '#арендадекора', '#пригласительные', '#свадебнаяарка', '#лимузиналматы', '#фотозона', '#кэндибар'],
    },
  },
  logistics: {
    label: 'Логистика и доставка',
    hashtags: {
      high: ['#доставка', '#грузоперевозки', '#логистика', '#карго', '#переезд', '#transport', '#delivery', '#курьер', '#склад', '#экспедирование'],
      mid: ['#доставкаалматы', '#грузоперевозкикз', '#каргокитай', '#каргоалматы', '#переездалматы', '#грузчикиалматы', '#газельалматы', '#фураалматы', '#контейнер', '#таможня'],
      low: ['#карготурция', '#сборныйгруз', '#рефрижератор', '#негабаритныйгруз', '#авиадоставка', '#жддоставка', '#складалматы', '#ответхранение', '#упаковкагруза', '#курьерскаяслужба'],
    },
  },
  agriculture: {
    label: 'Сельское хозяйство',
    hashtags: {
      high: ['#сельскоехозяйство', '#агро', '#фермер', '#урожай', '#зерно', '#мясо', '#молоко', '#овощи', '#фрукты', '#казахстан'],
      mid: ['#агрокз', '#фермеркз', '#пшеницакз', '#скотоводство', '#птицеводство', '#теплицакз', '#семенакз', '#удобрения', '#сельхозтехника', '#комбайн'],
      low: ['#капельныйполив', '#органическоеземледелие', '#пчеловодство', '#кумыс', '#шубат', '#баранинакз', '#конинакз', '#элеватор', '#мукомольный', '#маслозавод'],
    },
  },
  finance: {
    label: 'Финансы и страхование',
    hashtags: {
      high: ['#финансы', '#деньги', '#инвестиции', '#бизнес', '#банк', '#кредит', '#страхование', '#ипотека', '#finance', '#money'],
      mid: ['#инвестициикз', '#бизнескз', '#кредиткз', '#страхованиекз', '#каспи', '#халык', '#бухгалтер', '#налогикз', '#ипотекакз', '#микрокредит'],
      low: ['#осмс', '#пенсиякз', '#депозит', '#лизинг', '#факторинг', '#бухгалтерияалматы', '#аудиткз', '#юристкз', '#регистрациябизнеса', '#ип'],
    },
  },
  pet: {
    label: 'Зоотовары и ветеринария',
    hashtags: {
      high: ['#собака', '#кошка', '#питомец', '#животные', '#dog', '#cat', '#pet', '#ветеринар', '#зоомагазин', '#корм'],
      mid: ['#ветклиникаалматы', '#грумингалматы', '#зоомагазиналматы', '#кормдлясобак', '#кормдлякошек', '#дрессировка', '#передержка', '#приютдляживотных', '#породистыйщенок', '#котенок'],
      low: ['#хендлер', '#выставкасобак', '#канистерапия', '#ветстоматолог', '#узиживотных', '#кастрация', '#стерилизация', '#вакцинация', '#чипирование', '#зоогостиница'],
    },
  },
  entertainment: {
    label: 'Развлечения и досуг',
    hashtags: {
      high: ['#развлечения', '#досуг', '#отдых', '#вечеринка', '#клуб', '#бар', '#караоке', '#квест', '#кино', '#концерт'],
      mid: ['#развлеченияалматы', '#кудапойтиалматы', '#кудапойтиастана', '#караокеалматы', '#баралматы', '#клубалматы', '#квесталматы', '#боулингалматы', '#бильярдалматы', '#кинотеатр'],
      low: ['#антикафе', '#настолкиалматы', '#лазертаг', '#пейнтбол', '#картинг', '#аквапарк', '#ледовыйкаток', '#скалодром', '#верёвочныйпарк', '#квизалматы'],
    },
  },
}

const CITIES_HASHTAGS: Record<string, string[]> = {
  'Алматы': ['#алматы', '#almaty', '#алматыкз', '#алматысити', '#алматыгород'],
  'Астана': ['#астана', '#astana', '#нурсултан', '#астанакз', '#столицакз'],
  'Шымкент': ['#шымкент', '#shymkent', '#шымкенткз', '#шымкентсити'],
  'Караганда': ['#караганда', '#karaganda', '#караганды', '#карагандакз'],
  'Актобе': ['#актобе', '#aktobe', '#актобекз', '#актобесити'],
  'Атырау': ['#атырау', '#atyrau', '#атыраукз', '#нефтянаястолица'],
  'Павлодар': ['#павлодар', '#pavlodar', '#павлодаркз'],
  'Костанай': ['#костанай', '#kostanay', '#костанайкз'],
  'Тараз': ['#тараз', '#taraz', '#таразкз'],
  'Усть-Каменогорск': ['#усткаменогорск', '#оскемен', '#вко'],
  'Петропавловск': ['#петропавловск', '#ско', '#петропавловсккз'],
  'Семей': ['#семей', '#semey', '#семейкз'],
  'Актау': ['#актау', '#aktau', '#актаукз', '#мангистау'],
  'Кызылорда': ['#кызылорда', '#kyzylorda', '#кызылордакз'],
  'Туркестан': ['#туркестан', '#turkestan', '#туркестанкз'],
}

// ─── CONTENT PLAN TEMPLATES ─────────────────────────────────────────
type ContentDay = { day: string; type: string; topic: string; caption: string; cta: string; format: 'Пост' | 'Reels' | 'Сторис' | 'Карусель' }

const CONTENT_PLANS: Record<string, ContentDay[]> = {
  restaurants: [
    { day: 'Пн', type: '🍳 Вовлечение', topic: 'Завтрак дня', caption: 'Идеальное утро начинается с нашего завтрака 🥐☕️ А какой ваш любимый завтрак?', cta: 'Напишите в комментариях!', format: 'Reels' },
    { day: 'Вт', type: '👨‍🍳 За кулисами', topic: 'Шеф готовит', caption: 'Наш шеф-повар раскрывает секрет фирменного блюда 🔥', cta: 'Забронируйте столик в шапке профиля', format: 'Reels' },
    { day: 'Ср', type: '📸 Продающий', topic: 'Блюдо дня', caption: 'Новинка в меню! Попробуйте первыми по специальной цене 🎉', cta: 'Цена только до пятницы — бронируйте!', format: 'Карусель' },
    { day: 'Чт', type: '💬 Отзыв', topic: 'Гость рекомендует', caption: 'Спасибо нашим гостям за тёплые слова ❤️ Вот что пишут о нас:', cta: 'Оставьте свой отзыв в Google Maps', format: 'Сторис' },
    { day: 'Пт', type: '🎉 Акция', topic: 'Пятничная скидка', caption: 'ПЯТНИЦА = скидка 15% на всё меню! Только сегодня 🔥', cta: 'Покажите этот пост официанту', format: 'Пост' },
    { day: 'Сб', type: '🎬 Атмосфера', topic: 'Вечер у нас', caption: 'Субботний вечер в нашем ресторане — живая музыка, вкусная еда, тёплая атмосфера 🎶', cta: 'Бронируйте столик в WhatsApp', format: 'Reels' },
    { day: 'Вс', type: '📋 Полезное', topic: 'Рецепт от шефа', caption: 'Делимся рецептом, который вы можете повторить дома 🏠👨‍🍳', cta: 'Сохраняйте и пробуйте!', format: 'Карусель' },
  ],
  beauty: [
    { day: 'Пн', type: '💅 До/После', topic: 'Трансформация', caption: 'Смотрите результат! Наш мастер творит чудеса ✨', cta: 'Запишитесь через WhatsApp', format: 'Reels' },
    { day: 'Вт', type: '📚 Обучение', topic: 'Уход за кожей', caption: '5 ошибок в уходе за кожей, которые старят вас на 10 лет 😱', cta: 'Сохраните и поделитесь с подругой!', format: 'Карусель' },
    { day: 'Ср', type: '💰 Продающий', topic: 'Услуга месяца', caption: 'Комплекс "Идеальная кожа" со скидкой 20% весь месяц 🎉', cta: 'Запишитесь сегодня — мест мало!', format: 'Пост' },
    { day: 'Чт', type: '👩‍🔬 Эксперт', topic: 'Совет косметолога', caption: 'Наш косметолог отвечает на самый частый вопрос клиентов 🤔', cta: 'Задайте свой вопрос в комментариях', format: 'Reels' },
    { day: 'Пт', type: '⭐ Отзыв', topic: 'Клиент рекомендует', caption: 'Наша постоянная клиентка делится впечатлениями ❤️', cta: 'Хотите так же? Ссылка для записи в шапке', format: 'Сторис' },
    { day: 'Сб', type: '🎁 Акция', topic: 'Выходной бонус', caption: 'Суббота = приведи подругу и получи скидку 30% обеим! 👯‍♀️', cta: 'Отмечайте подруг в комментариях', format: 'Пост' },
    { day: 'Вс', type: '🔮 Тренды', topic: 'Тренд сезона', caption: 'Главный тренд этого сезона — рассказываем и показываем 💫', cta: 'Хотите попробовать? Пишите в директ', format: 'Reels' },
  ],
  fitness: [
    { day: 'Пн', type: '💪 Мотивация', topic: 'Понедельник — старт', caption: 'Новая неделя — новые цели! 🔥 Кто сегодня на тренировке?', cta: 'Отмечайте друга, с кем тренируетесь', format: 'Reels' },
    { day: 'Вт', type: '🏋️ Тренировка', topic: 'Упражнение дня', caption: 'Топ-3 упражнения на пресс, которые реально работают 🎯', cta: 'Сохраняйте и повторяйте!', format: 'Reels' },
    { day: 'Ср', type: '🥗 Питание', topic: 'Рецепт ПП', caption: 'Белковый завтрак за 5 минут — идеально для тех, кто спешит ⏰', cta: 'Больше рецептов в сохраненках', format: 'Карусель' },
    { day: 'Чт', type: '📊 Результат', topic: 'До/После клиента', caption: 'Минус 15 кг за 3 месяца! История нашего клиента 🏆', cta: 'Хотите так же? Запишитесь на консультацию', format: 'Карусель' },
    { day: 'Пт', type: '🎯 Продающий', topic: 'Абонемент', caption: 'Успей купить абонемент со скидкой 25%! Осталось 10 мест 🔥', cta: 'Бронируйте в WhatsApp', format: 'Пост' },
    { day: 'Сб', type: '🎬 Закулисье', topic: 'Наш зал', caption: 'Утренняя тренировка в нашем зале — энергия зашкаливает! ⚡', cta: 'Приходите завтра на бесплатную пробную', format: 'Reels' },
    { day: 'Вс', type: '💡 Полезное', topic: 'Лайфхак', caption: '5 привычек, которые ускорят результат от тренировок в 2 раза 📈', cta: 'Какой совет вам ближе? Пишите номер!', format: 'Карусель' },
  ],
  medicine: [
    { day: 'Пн', type: '🩺 Экспертиза', topic: 'Совет врача', caption: 'Врач-терапевт: 3 симптома, которые нельзя игнорировать ⚠️', cta: 'Запишитесь на check-up в шапке профиля', format: 'Карусель' },
    { day: 'Вт', type: '🦷 Услуга', topic: 'Профессиональная чистка', caption: 'Зачем нужна проф. чистка зубов каждые 6 месяцев? Объясняем просто 🪥', cta: 'Запишитесь со скидкой 15% до конца месяца', format: 'Reels' },
    { day: 'Ср', type: '❤️ Отзыв', topic: 'Пациент рекомендует', caption: 'Спасибо за доверие! Вот что говорят наши пациенты 🙏', cta: 'Запись через WhatsApp — быстро и удобно', format: 'Сторис' },
    { day: 'Чт', type: '📚 Обучение', topic: 'Мифы о здоровье', caption: 'Разрушаем 5 популярных мифов о здоровье 🤯', cta: 'А вы верили в какой-нибудь из них? Пишите!', format: 'Карусель' },
    { day: 'Пт', type: '💰 Акция', topic: 'Пакет обследований', caption: 'Полный check-up со скидкой 30%! Только до конца месяца 🏥', cta: 'Звоните или пишите для записи', format: 'Пост' },
    { day: 'Сб', type: '👨‍⚕️ Знакомство', topic: 'Наш врач', caption: 'Знакомьтесь — наш кардиолог с 15-летним опытом 🫀', cta: 'Запишитесь на консультацию', format: 'Reels' },
    { day: 'Вс', type: '🧘 Профилактика', topic: 'ЗОЖ-совет', caption: '5 простых привычек для крепкого иммунитета этой зимой ❄️🛡', cta: 'Сохраняйте себе!', format: 'Карусель' },
  ],
  realestate: [
    { day: 'Пн', type: '🏠 Объект', topic: 'Квартира недели', caption: '3-комнатная в новом ЖК, панорамные окна, рядом парк 🌳', cta: 'Видеообзор — смотрите до конца!', format: 'Reels' },
    { day: 'Вт', type: '📊 Аналитика', topic: 'Рынок недвижимости', caption: 'Цены на жильё в Алматы: что изменилось за месяц? 📈', cta: 'Подпишитесь, чтобы не пропустить обзоры', format: 'Карусель' },
    { day: 'Ср', type: '💡 Совет', topic: 'Как выбрать ЖК', caption: '7 вещей, которые надо проверить ДО покупки квартиры в новостройке ✅', cta: 'Сохраните этот чеклист!', format: 'Карусель' },
    { day: 'Чт', type: '🎬 Обзор', topic: 'ЖК изнутри', caption: 'Показываем ЖК, о котором все говорят — честный обзор 🔍', cta: 'Интересно? Пишите — организуем просмотр', format: 'Reels' },
    { day: 'Пт', type: '💰 Ипотека', topic: 'Ипотечный калькулятор', caption: 'Сколько стоит ипотека в 2025? Считаем на реальном примере 🧮', cta: 'Нужна консультация? Пишите в WhatsApp', format: 'Карусель' },
    { day: 'Сб', type: '⭐ Кейс', topic: 'Клиент купил', caption: 'Помогли семье найти идеальную квартиру за 2 недели 🏡❤️', cta: 'Хотите так же? Оставьте заявку', format: 'Сторис' },
    { day: 'Вс', type: '🏙 Район', topic: 'Обзор района', caption: 'Где лучше жить в Алматы? Разбираем плюсы и минусы районов 📍', cta: 'А вы в каком районе? Пишите!', format: 'Reels' },
  ],
  auto: [
    { day: 'Пн', type: '🔧 Совет', topic: 'Лайфхак для авто', caption: '5 вещей, которые должны быть в каждом авто зимой ❄️🚗', cta: 'Сохраните — пригодится!', format: 'Карусель' },
    { day: 'Вт', type: '🎬 Работа', topic: 'Процесс ремонта', caption: 'Смотрите как мы восстановили бампер за 4 часа 🔥', cta: 'Нужен ремонт? Пишите — оценим бесплатно', format: 'Reels' },
    { day: 'Ср', type: '💰 Услуга', topic: 'Акция на ТО', caption: 'Полное ТО со скидкой 20% — только на этой неделе! 🛠', cta: 'Запишитесь через WhatsApp', format: 'Пост' },
    { day: 'Чт', type: '⚠️ Обучение', topic: 'Признаки поломки', caption: '3 звука в машине, которые нельзя игнорировать 🔊⚠️', cta: 'Слышите что-то подобное? Приезжайте на диагностику', format: 'Reels' },
    { day: 'Пт', type: '⭐ До/После', topic: 'Результат работы', caption: 'Было — Стало! Полная покраска за 3 дня 🎨✨', cta: 'Хотите так же? Звоните!', format: 'Карусель' },
    { day: 'Сб', type: '🏎 Обзор', topic: 'Авто дня', caption: 'Обзор самого популярного авто в Казахстане 2025 📊', cta: 'А у вас какая машина? Пишите!', format: 'Reels' },
    { day: 'Вс', type: '💡 Полезное', topic: 'Как экономить', caption: 'Как снизить расход топлива на 15% — 5 проверенных способов ⛽', cta: 'Какой способ ваш? Напишите номер!', format: 'Карусель' },
  ],
}

// ─── CALENDAR OF EVENTS ─────────────────────────────────────────────
type CalendarEvent = { date: string; name: string; icon: string; niches: string[]; tip: string }

const CALENDAR_EVENTS: CalendarEvent[] = [
  { date: '01.01', name: 'Новый год', icon: '🎄', niches: ['Все ниши'], tip: 'Новогодние акции, подарочные сертификаты, итоги года' },
  { date: '07.01', name: 'Рождество', icon: '⭐', niches: ['Рестораны', 'Отели', 'Развлечения'], tip: 'Рождественские ужины, праздничное меню, каникулы' },
  { date: '14.02', name: 'День Святого Валентина', icon: '❤️', niches: ['Рестораны', 'Салоны', 'Цветы', 'Ювелирка', 'Отели'], tip: 'Романтические ужины, подарки, парные процедуры' },
  { date: '08.03', name: 'Международный женский день', icon: '🌷', niches: ['Все ниши'], tip: 'Скидки для женщин, подарочные наборы, акции' },
  { date: '21.03', name: 'Наурыз', icon: '🇰🇿', niches: ['Все ниши'], tip: 'Главный праздник КЗ! Национальная тематика, скидки, мероприятия' },
  { date: '22.03', name: 'Наурыз (2-й день)', icon: '🎉', niches: ['Рестораны', 'Развлечения', 'Отели'], tip: 'Тои, гулянья, национальная кухня, наурыз-коже' },
  { date: '01.05', name: 'День единства народа', icon: '🤝', niches: ['Все ниши'], tip: 'Тема единства, патриотический контент' },
  { date: '07.05', name: 'День защитника Отечества', icon: '🎖', niches: ['Авто', 'Фитнес', 'Одежда'], tip: 'Мужские подарки, акции для мужчин' },
  { date: '09.05', name: 'День Победы', icon: '🏅', niches: ['Все ниши'], tip: 'Поздравительный контент, уважительный тон' },
  { date: '01.06', name: 'День защиты детей', icon: '👶', niches: ['Детские', 'Образование', 'Развлечения'], tip: 'Акции для детей, семейные мероприятия' },
  { date: '06.07', name: 'День столицы', icon: '🏛', niches: ['Все ниши (Астана)'], tip: 'Контент про Астану, городские акции' },
  { date: '30.08', name: 'День Конституции', icon: '📜', niches: ['Все ниши'], tip: 'Патриотический контент, выходной — акции' },
  { date: '01.09', name: 'День знаний', icon: '📚', niches: ['Образование', 'Детские', 'Одежда', 'Канцелярия'], tip: 'Школьные акции, back-to-school кампании' },
  { date: '25.10', name: 'День республики', icon: '🇰🇿', niches: ['Все ниши'], tip: 'Национальная гордость, казахстанская тематика' },
  { date: '24.11', name: 'Black Friday', icon: '🛍', niches: ['Все ниши'], tip: 'Распродажи! Готовьте контент за 2 недели' },
  { date: '01.12', name: 'День Первого Президента', icon: '🏛', niches: ['Все ниши'], tip: 'Официальный контент, поздравления' },
  { date: '16.12', name: 'День Независимости', icon: '🇰🇿', niches: ['Все ниши'], tip: 'Главный государственный праздник, патриотика' },
  { date: '25.12', name: 'Католическое Рождество', icon: '🎁', niches: ['Отели', 'Рестораны', 'Развлечения'], tip: 'Международная аудитория, зимние акции' },
  { date: '31.12', name: 'Канун Нового года', icon: '🎆', niches: ['Все ниши'], tip: 'Финальные акции года, подведение итогов, корпоративы' },
  // Seasonal
  { date: '01.03', name: '🌸 Начало весны', icon: '🌿', niches: ['Салоны', 'Фитнес', 'Одежда'], tip: 'Весеннее обновление, детокс, новые коллекции' },
  { date: '01.06', name: '☀️ Начало лета', icon: '🌞', niches: ['Отели', 'Фитнес', 'Авто', 'Развлечения'], tip: 'Летние акции, отпуск, пляж, путешествия' },
  { date: '01.09', name: '🍂 Начало осени', icon: '🍁', niches: ['Образование', 'Одежда', 'Салоны'], tip: 'Осенние коллекции, уход, учеба' },
  { date: '01.12', name: '❄️ Начало зимы', icon: '⛷', niches: ['Отели', 'Авто', 'Развлечения'], tip: 'Зимние активности, новогодняя подготовка' },
]

// ─── SMM CALCULATOR ──────────────────────────────────────────────────
type SmmPackage = { name: string; posts: number; stories: number; reels: number; target: boolean; reports: string; price: number }

const SMM_PACKAGES: SmmPackage[] = [
  { name: 'Базовый', posts: 12, stories: 20, reels: 2, target: false, reports: 'Ежемесячный', price: 150000 },
  { name: 'Стандарт', posts: 20, stories: 40, reels: 4, target: true, reports: 'Еженедельный', price: 350000 },
  { name: 'Премиум', posts: 30, stories: 60, reels: 8, target: true, reports: 'Еженедельный + стратегия', price: 600000 },
]

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function SmmPage() {
  const [tab, setTab] = useState<Tab>('hashtags')

  // Hashtags state
  const [selectedNiche, setSelectedNiche] = useState('restaurants')
  const [selectedCity, setSelectedCity] = useState('Алматы')
  const [customTag, setCustomTag] = useState('')
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null)

  // Content plan state
  const [contentNiche, setContentNiche] = useState('restaurants')

  // Calendar state
  const [calendarFilter, setCalendarFilter] = useState('')

  // Calculator state
  const [calcPosts, setCalcPosts] = useState(20)
  const [calcStories, setCalcStories] = useState(40)
  const [calcReels, setCalcReels] = useState(4)
  const [calcTarget, setCalcTarget] = useState(true)
  const [calcPhotoshoot, setCalcPhotoshoot] = useState(false)

  const calcPrice = useMemo(() => {
    let base = 0
    base += calcPosts * 8000
    base += calcStories * 3000
    base += calcReels * 25000
    if (calcTarget) base += 80000
    if (calcPhotoshoot) base += 120000
    return base
  }, [calcPosts, calcStories, calcReels, calcTarget, calcPhotoshoot])

  // Hashtag generation
  const generatedHashtags = useMemo(() => {
    const niche = NICHES[selectedNiche]
    if (!niche) return { high: [], mid: [], low: [], city: [] }
    const city = CITIES_HASHTAGS[selectedCity] || []
    return { ...niche.hashtags, city }
  }, [selectedNiche, selectedCity])

  const allHashtags = useMemo(() => {
    const all = [...generatedHashtags.city.slice(0, 2), ...generatedHashtags.high.slice(0, 5), ...generatedHashtags.mid.slice(0, 5), ...generatedHashtags.low.slice(0, 5)]
    if (customTag.trim()) all.push(customTag.trim().startsWith('#') ? customTag.trim() : '#' + customTag.trim())
    return all.slice(0, 30)
  }, [generatedHashtags, customTag])

  const copyHashtags = (tags: string[], group: string) => {
    navigator.clipboard.writeText(tags.join(' '))
    setCopiedGroup(group)
    setTimeout(() => setCopiedGroup(null), 2000)
  }

  // Calendar filtered
  const filteredEvents = useMemo(() => {
    if (!calendarFilter) return CALENDAR_EVENTS
    const q = calendarFilter.toLowerCase()
    return CALENDAR_EVENTS.filter(e => e.name.toLowerCase().includes(q) || e.niches.some(n => n.toLowerCase().includes(q)) || e.tip.toLowerCase().includes(q))
  }, [calendarFilter])

  // Content plan
  const contentPlan = CONTENT_PLANS[contentNiche] || CONTENT_PLANS.restaurants

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'hashtags', label: 'Хештеги', icon: '#️⃣' },
    { id: 'content', label: 'Контент-план', icon: '📝' },
    { id: 'calendar', label: 'Календарь', icon: '📅' },
    { id: 'calculator', label: 'Калькулятор', icon: '💰' },
    { id: 'leads', label: 'Поиск лидов', icon: '🔍' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/pabliks" className="text-cyan-400 hover:text-cyan-300 text-sm mb-2 inline-block">← Медиа-ресурсы</Link>
        <h1 className="text-2xl font-bold mb-1">🚀 SMM-Ведение</h1>
        <p className="text-gray-400 text-sm">Инструменты для органического продвижения и генерации лидов</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              tab === t.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ HASHTAGS TAB ═══════════════ */}
      {tab === 'hashtags' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Ниша</label>
              <select
                value={selectedNiche}
                onChange={e => setSelectedNiche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm"
              >
                {Object.entries(NICHES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Город</label>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm"
              >
                {Object.keys(CITIES_HASHTAGS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Свой хештег</label>
              <input
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                placeholder="#вашхештег"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* All 30 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">📋 Все хештеги ({allHashtags.length})</h3>
                <button
                  onClick={() => copyHashtags(allHashtags, 'all')}
                  className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg hover:bg-cyan-500/30 transition"
                >
                  {copiedGroup === 'all' ? '✅ Скопировано!' : '📋 Копировать все'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allHashtags.map((tag, i) => (
                  <span key={i} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-lg text-xs">{tag}</span>
                ))}
              </div>
            </div>

            {/* By group */}
            <div className="space-y-3">
              {[
                { key: 'city', label: '📍 Город', tags: generatedHashtags.city, color: 'text-green-400' },
                { key: 'high', label: '🔥 Высокочастотные', tags: generatedHashtags.high, color: 'text-red-400' },
                { key: 'mid', label: '📊 Среднечастотные', tags: generatedHashtags.mid, color: 'text-yellow-400' },
                { key: 'low', label: '🎯 Низкочастотные', tags: generatedHashtags.low, color: 'text-blue-400' },
              ].map(group => (
                <div key={group.key} className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-sm font-medium ${group.color}`}>{group.label} ({group.tags.length})</h4>
                    <button
                      onClick={() => copyHashtags(group.tags, group.key)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      {copiedGroup === group.key ? '✅' : '📋'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.tags.map((tag, i) => (
                      <span key={i} className="text-gray-400 text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
            <h3 className="font-semibold text-cyan-400 mb-2">💡 Советы по хештегам</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Используйте <b>микс</b> из высоко-, средне- и низкочастотных хештегов</li>
              <li>• Городские хештеги ставьте <b>первыми</b> — они привлекают локальную аудиторию</li>
              <li>• Оптимальное количество: <b>20-25 хештегов</b> на пост</li>
              <li>• Меняйте набор хештегов каждые <b>2-3 поста</b>, чтобы избежать теневого бана</li>
              <li>• Добавляйте <b>1-2 уникальных</b> хештега вашего бренда</li>
            </ul>
          </div>
        </div>
      )}

      {/* ═══════════════ CONTENT PLAN TAB ═══════════════ */}
      {tab === 'content' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Ниша</label>
              <select
                value={contentNiche}
                onChange={e => setContentNiche(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm"
              >
                {Object.entries(CONTENT_PLANS).map(([k]) => (
                  <option key={k} value={k}>{NICHES[k]?.label || k}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400 mt-6">
              📅 Контент-план на неделю • 7 публикаций • микс форматов
            </div>
          </div>

          <div className="space-y-3">
            {contentPlan.map((day, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 hover:border-gray-600 transition">
                <div className="flex items-start gap-4">
                  {/* Day */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-300">{day.day}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold">{day.type}</span>
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{day.format}</span>
                      <span className="text-xs text-gray-500">{day.topic}</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{day.caption}</p>
                    <div className="text-xs text-cyan-400">CTA: {day.cta}</div>
                  </div>

                  {/* Copy */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${day.caption}\n\n${day.cta}`)
                      setCopiedGroup('content_' + i)
                      setTimeout(() => setCopiedGroup(null), 2000)
                    }}
                    className="flex-shrink-0 text-gray-500 hover:text-gray-300 text-sm"
                  >
                    {copiedGroup === 'content_' + i ? '✅' : '📋'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Content tips */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
            <h3 className="font-semibold text-cyan-400 mb-2">💡 Формула контента</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">40%</div>
                <div className="text-gray-400">Вовлечение</div>
                <div className="text-xs text-gray-500">Вопросы, истории, закулисье</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">25%</div>
                <div className="text-gray-400">Продающий</div>
                <div className="text-xs text-gray-500">Акции, услуги, товары</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">20%</div>
                <div className="text-gray-400">Экспертный</div>
                <div className="text-xs text-gray-500">Советы, обучение, лайфхаки</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">15%</div>
                <div className="text-gray-400">Социальный</div>
                <div className="text-xs text-gray-500">Отзывы, UGC, кейсы</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ CALENDAR TAB ═══════════════ */}
      {tab === 'calendar' && (
        <div className="space-y-6">
          <div>
            <input
              value={calendarFilter}
              onChange={e => setCalendarFilter(e.target.value)}
              placeholder="🔍 Поиск по празднику или нише..."
              className="w-full md:w-96 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredEvents.map((event, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 hover:border-gray-600 transition">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{event.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-cyan-400">{event.date}</span>
                      <span className="font-semibold">{event.name}</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{event.tip}</p>
                    <div className="flex flex-wrap gap-1">
                      {event.niches.map((n, j) => (
                        <span key={j} className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ CALCULATOR TAB ═══════════════ */}
      {tab === 'calculator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom calculator */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">⚙️ Настроить пакет</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Постов в месяц</span>
                    <span className="font-medium">{calcPosts}</span>
                  </div>
                  <input type="range" min={4} max={60} value={calcPosts} onChange={e => setCalcPosts(+e.target.value)}
                    className="w-full accent-cyan-500" />
                  <div className="flex justify-between text-xs text-gray-500"><span>4</span><span>60</span></div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Сторис в месяц</span>
                    <span className="font-medium">{calcStories}</span>
                  </div>
                  <input type="range" min={0} max={120} value={calcStories} onChange={e => setCalcStories(+e.target.value)}
                    className="w-full accent-cyan-500" />
                  <div className="flex justify-between text-xs text-gray-500"><span>0</span><span>120</span></div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Reels в месяц</span>
                    <span className="font-medium">{calcReels}</span>
                  </div>
                  <input type="range" min={0} max={20} value={calcReels} onChange={e => setCalcReels(+e.target.value)}
                    className="w-full accent-cyan-500" />
                  <div className="flex justify-between text-xs text-gray-500"><span>0</span><span>20</span></div>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Таргетированная реклама</span>
                  <button
                    onClick={() => setCalcTarget(!calcTarget)}
                    className={`w-12 h-6 rounded-full transition ${calcTarget ? 'bg-cyan-500' : 'bg-gray-600'} relative`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition ${calcTarget ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Фотосессия (1 раз/мес)</span>
                  <button
                    onClick={() => setCalcPhotoshoot(!calcPhotoshoot)}
                    className={`w-12 h-6 rounded-full transition ${calcPhotoshoot ? 'bg-cyan-500' : 'bg-gray-600'} relative`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition ${calcPhotoshoot ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Total */}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-600">
                  <div className="text-sm text-gray-400 mb-1">Стоимость SMM-ведения</div>
                  <div className="text-3xl font-bold text-cyan-400">
                    {new Intl.NumberFormat('ru-RU').format(calcPrice)} ₸
                  </div>
                  <div className="text-xs text-gray-500 mt-1">в месяц</div>
                </div>
              </div>
            </div>

            {/* Ready packages */}
            <div className="space-y-4">
              <h3 className="font-semibold">📦 Готовые пакеты</h3>
              {SMM_PACKAGES.map((pkg, i) => (
                <div
                  key={i}
                  className={`border rounded-2xl p-4 transition cursor-pointer hover:border-gray-500 ${
                    i === 1 ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700 bg-gray-800/50'
                  }`}
                  onClick={() => {
                    setCalcPosts(pkg.posts)
                    setCalcStories(pkg.stories)
                    setCalcReels(pkg.reels)
                    setCalcTarget(pkg.target)
                    setCalcPhotoshoot(i === 2)
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold">{pkg.name}</span>
                      {i === 1 && <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Популярный</span>}
                    </div>
                    <div className="text-lg font-bold text-cyan-400">
                      {new Intl.NumberFormat('ru-RU').format(pkg.price)} ₸
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                    <div>📸 {pkg.posts} постов/мес</div>
                    <div>📱 {pkg.stories} сторис/мес</div>
                    <div>🎬 {pkg.reels} reels/мес</div>
                    <div>{pkg.target ? '🎯 Таргет включён' : '❌ Без таргета'}</div>
                    <div className="col-span-2">📊 {pkg.reports}</div>
                  </div>
                </div>
              ))}

              {/* Price breakdown */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-sm">
                <h4 className="font-medium mb-2">💎 Расценки</h4>
                <div className="space-y-1 text-gray-400">
                  <div className="flex justify-between"><span>1 пост (фото + текст + хештеги)</span><span>8 000 ₸</span></div>
                  <div className="flex justify-between"><span>1 сторис</span><span>3 000 ₸</span></div>
                  <div className="flex justify-between"><span>1 Reels (сценарий + монтаж)</span><span>25 000 ₸</span></div>
                  <div className="flex justify-between"><span>Таргет (настройка + ведение)</span><span>80 000 ₸/мес</span></div>
                  <div className="flex justify-between"><span>Фотосессия (1 раз/мес)</span><span>120 000 ₸</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ LEADS TAB ═══════════════ */}
      {tab === 'leads' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'В базе 2GIS', value: '2 949', icon: '📍', color: 'text-green-400' },
              { label: 'Всего клиентов', value: '5 150+', icon: '👥', color: 'text-cyan-400' },
              { label: 'Городов', value: '15', icon: '🏙', color: 'text-purple-400' },
              { label: 'Ниш', value: '18', icon: '🏷', color: 'text-yellow-400' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Lead sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">📍 Парсер 2GIS</h3>
              <p className="text-sm text-gray-400 mb-4">
                Автоматический сбор бизнесов из 2GIS по городу и категории. Собираем: название, телефон, адрес, Instagram, рейтинг.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-400">✅ Алматы — 2 949 лидов</div>
                <div className="flex items-center gap-2 text-gray-500">⏳ Астана — скоро</div>
                <div className="flex items-center gap-2 text-gray-500">⏳ Шымкент — скоро</div>
                <div className="flex items-center gap-2 text-gray-500">⏳ Караганда — скоро</div>
              </div>
              <button className="mt-4 w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl py-2 text-sm hover:bg-cyan-500/30 transition">
                🔄 Запустить парсинг нового города
              </button>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">📸 Instagram-разведка</h3>
              <p className="text-sm text-gray-400 mb-4">
                Поиск бизнес-аккаунтов по хештегам и геолокации. Анализ: подписчики, вовлечённость, наличие рекламы.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Хештег или геолокация</label>
                  <input placeholder="#кафеалматы" className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Мин. подписчиков</label>
                  <input type="number" placeholder="1000" className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <button className="mt-4 w-full bg-gray-700 text-gray-400 border border-gray-600 rounded-xl py-2 text-sm cursor-not-allowed">
                🔒 Скоро — требуется API
              </button>
            </div>
          </div>

          {/* Lead scoring info */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
            <h3 className="font-semibold text-cyan-400 mb-2">🎯 Скоринг лидов</h3>
            <p className="text-sm text-gray-300 mb-3">Каждый лид получает оценку от 1 до 100 на основе:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="font-medium mb-1">👥 Подписчики</div>
                <div className="text-xs text-gray-400">Больше = выше скор</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="font-medium mb-1">📊 Активность</div>
                <div className="text-xs text-gray-400">Частота постов, сторис</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="font-medium mb-1">💰 Бюджет</div>
                <div className="text-xs text-gray-400">Признаки рекламных бюджетов</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="font-medium mb-1">📍 Локация</div>
                <div className="text-xs text-gray-400">Город и район</div>
              </div>
            </div>
          </div>

          {/* Link to CRM */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">👥 Перейти в CRM</h3>
              <p className="text-sm text-gray-400">Работайте с лидами в разделе Клиенты</p>
            </div>
            <Link href="/dashboard/clients" className="bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-cyan-600 transition">
              Открыть →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
