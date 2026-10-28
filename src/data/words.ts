/** Lowercase letters-only word pool. Lessons filter it by the letters a learner already knows. */
const POOL = `
a ad add adds ads ah alas all ask asks dad dads dash fad fads fall falls flag flags flask flasks flash gag gags gas gash glad
had hag hall halls half hash jag jags lad lads lag lags lash sad sag sags saga sagas salad salads shall slag slash alfalfa
as at ate eat east eel egg else ease fat fast feet feed fed fee few fish fill fire fit flat flew flow flower fold folk food foot
for fork form free from full get gift girl glass go goes gold good great ground grow had hair hand hard has hat he head hear
heat held help her here hide high hill his hold hole home hope horse hot house how if in is it its jar jet jog join joke just
keep key kid kill kind king kiss kite knee lady lake land last late lead leaf left leg let life lift light like line lip list
little live local lock long look lose lost love low luck she shall shed sheet shelf shell shift shirt shoe shook short shot
should sit six skill skirt sleep slide slow small so soft sold some soon sort soul spoke stay steel step still stood stop
street strong sure sweet tale talk tall tea tear tell the their then there these they thing this those three through tie
tight till time to tool top tower tree tried true try two type use user wait walk wall want was watch water way we wear week
well were wet what when where which while white who whole why will wind wing wish with wood word work would write wrote
yard year yell yes yet you young your add fuel quiet quit quite quote queen quick power pretty pillow yellow history
require require reply report result return right rise road rock roof room root rope rose route rule run
air all and any arm art ask bad bag ball band bank bar base bat bear beat bed bell bench best bet big bike bill bird bit
black blue boat body bone book boot born both bowl box boy brain bread break bring brown build burn bus busy buy cake call
calm came camp can car card care carry case cat catch cause cell chair chance change chart check child city class clean
clear clock close cloud club coat cold color come cook cool copy corn cost could count course cover crew cross crowd cry
cup cut dance dark data date day dead deal dear deep desk die dig dinner dirt dish do doctor dog dollar door down draw dream
dress drink drive drop dry duck dust each ear early earth easy edge end enemy enjoy enough enter even event ever every
exact exit eye face fact fair faith family fan far farm fear field fight find fine finger finish first flight floor fly fog
follow force forest forget fresh friend front fruit fun funny future game garden gate gave gentle give glove goal gone
grass gray green group guard guess guide gun habit half happy hate have heart heavy hello hero hide hobby hungry hurry
ice idea image inch iron island issue item jacket job joy judge jump keen kick kitchen knife know label lamp large laugh
law lazy learn leave lemon lesson letter level library lie limit lion liquid listen lunch machine main major make man many
map mark market master match matter may meal mean measure meat meet member memory metal middle might mile milk mind mine
minute mirror miss mix model moment money month moon more morning most mother motor mountain mouth move movie much music
must name narrow nation nature near neck need neither nerve never new news next nice night noise none noon north nose note
nothing notice now number nurse object ocean odd off offer office often oil old once one only open orange order other our
out over owner pack page pain paint pair paper parent park part party pass past path pay peace pen people pepper perfect
person phone photo piano pick picture piece pilot pink place plan plane plant plastic plate play please plenty pocket point
poor pool pop post pot pound pour press price pride print prize problem produce public pull pure push put quarter question
rabbit race rain raise range rapid rare rate rather raw reach read ready real reason red remember rent rest rice rich ride
ring river round row rub rush safe sail salt same sand save say scale school science score sea season seat second see seed
seem sell send sense serve seven shade shadow shape share sharp sheep shine ship shop shore show shut sick side sight sign
silent silver simple since sing single sister size skin sky smile smoke snow soap social sock song sound south space speak
special speed spell spend spin spoon sport spot spread spring square stage stair stamp stand star start state station
stick stone store storm story straight strange stream strength stretch strike string student study stuff such sudden sugar
suit summer sun supply support surface surprise swim switch table tail take taste teach team tell ten tend test than thank
that thick thin think third thought thousand thread throw thumb thunder ticket tiny tired title today together told tomorrow
tone tonight too tooth total touch toward town toy track trade train travel trick trip trouble truck trust truth turn
twelve twenty under unit until up upon upper use usual valley value very village visit voice wage wake warm warn wash waste
wave wealth weather wedding weight welcome west whale wheel whether whisper whistle wide wife wild win winter wire woman
wonder worry worth wrap wrong yesterday zebra zero zone zoom
`;

export const WORD_POOL: string[] = Array.from(new Set(POOL.split(/\s+/).filter((w) => /^[a-z]+$/.test(w))));

/** Words that use only letters in `allowed` (lowercase). */
export function wordsUsing(allowed: string, { min = 1, max = 99 }: { min?: number; max?: number } = {}): string[] {
  const set = new Set(allowed.split(''));
  return WORD_POOL.filter((w) => w.length >= min && w.length <= max && [...w].every((c) => set.has(c)));
}

/** Common words used by the "Common words" speed-test category (frequent short words). */
export const COMMON_WORDS: string[] = `
the of and to in is you that it he was for on are as with his they at be this from have or by one had not but what all were
when we there can an your which their said if do will each about how up out them then she many some so these would other into
has more her two like him see time could no make than first been its who now people my made over did down only way find use
may water long little very after words called just where most know get through back much before go good new write our used me
man too any day same right look think also around another came come work three word must because does part even place well
such here take why help put different away again off went old number great tell men say small every found still between name
should home big give air line set own under read last never us left end along while might next sound below saw something
thought both few those always show large often together asked house don't world going want school important until form food
keep children feet land side without boy once animal life enough took sometimes four head above kind began almost live page
got earth need far hand high year mother light country father let night picture being study second soon story since white
ever paper hard near sentence better best across during today however sure knew try told young sun thing whole hear example
heard several change answer room sea against top turned learn point city play toward five using himself usually
`
  .split(/\s+/)
  .filter((w) => /^[a-z]+$/.test(w));
