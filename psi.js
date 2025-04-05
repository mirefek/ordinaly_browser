/*
  Extended Bucholz psi function, all variables are ordinals
  * C_card(alpha) = smallest subclass of ordinals such that
    * 0 in C_card(alpha)
    * a, b in C_card(alpha) => (a + b) in C_card(alpha)
    * c, a in C_card(alpha), and a < alpha => psi_c(a) in C_card(a)
    * if card > 0 && x < aleph_card => x in C_card(alpha)
  * psi_card(alpha) = smallest x such that x not in C_card(alpha)

  monom: {
  "card" : Ordinal
  "arg" : Ordinal
  "mul" : int
  }
  psi_0(0) = 1

  Assuming the ordinal to already be in a normal form.
*/

class Ordinal {
    constructor(monoms) {
	this.m = monoms
	this.cache = {}
	for (var m of monoms) {
	    if (m.arg === undefined || m.card === undefined || m.mul === undefined) {
		console.log(monoms)
		hehe()
	    }
	}
    }
    static zero = new Ordinal([])
    static zeroMonom = {
	"card": Ordinal.zero,
	"arg" : Ordinal.zero,
	"mul" : 0,
    }
    // psiRaw expects correct inequalities for a normal form
    static psiRaw(card, arg, mul = 1) {
	return new Ordinal([{ "card": card, "arg": arg, "mul": mul }])
    }
    static fromInt(n) {
	if (n < 0) {
	    console.warn("Can only construct non-negative ordinals, not: "+n)
	    n = 0
	}
	return Ordinal.psiRaw(Ordinal.zero, Ordinal.zero, n)
    }
    
    toInt() {
	if (!this.isFinite()) {
	    console.warn("Cannot convert an infinite ordinal to an integer: "+this)
	    return 0
	}
	return this.firstM().mul	
    }

    static fromMonom(m, mul = 1) {
	if (mul < 0) mul = m.mul
	return Ordinal.psiRaw(m.card, m.arg, mul)
    }
    static one = Ordinal.fromInt(1)
    static two = Ordinal.fromInt(2)
    static omega = Ordinal.psiRaw(Ordinal.zero, Ordinal.one)

    // checks

    isZero() { return this.m.length == 0 }
    firstM() {
	if (this.isZero()) return Ordinal.zeroMonom
	else return this.m[0]
    }
    lastM() {
	if (this.isZero()) return Ordinal.zeroMonom
	else return this.m[this.m.length-1]
    }
    isOne() {
	if (this.m.length != 1) return false
	const m = this.m[0]
	return m.mul == 1 && m.card.isZero() && m.arg.isZero()
    }
    isFinite() {
	const first = this.firstM()
	return first.card.isZero() && first.arg.isZero()
    }
    isSucc() {
	if (this.isZero()) return false
	const last = this.lastM()
	return last.card.isZero() && last.arg.isZero()
    }
    isLimit() {
	return !this.isZero() && !this.isSucc()
    }
    isCountable() {
	return this.lastM().card.isZero()
    }
    // do not need parentheses when printing in an index
    isSimple() {
	if (this.m.length > 1) return false
	if (this.isZero()) return true
	const m = this.m[0]
	if (m.mul == 1) return true
	if (m.card.isZero && m.card.isZero) return true
	return false
    }

    // simple cached calculations
    cpx() {
	if (!("_cpx" in this)) {
	    cpx = 1
	    for (m of this.m) cpx += m.card.cpx + m.arg.cpx
	    this._cpx = cpx
	}
	return this._cpx
    }

    // comparison
    // a > b <=> a.cmp(b) > 0

    // only on monomials, ignores mul
    static cmpBase(a, b) {
	const cmp_card = a.card.cmp(b.card)
	if (cmp_card != 0) return cmp_card
	return a.arg.cmp(b.arg)
    }
    // on full ordinals
    cmp(other) {
	if (this === other) return 0
	for (var i = 0;; i++) {
	    if (i < this.m.length) {
		if (i < other.m.length) {
		    const mon1 = this.m[i]
		    const mon2 = other.m[i]
		    const cmp_base = Ordinal.cmpBase(mon1, mon2)
		    if (cmp_base != 0) return cmp_base
		    if (mon1.mul > mon2.mul) return 1
		    if (mon1.mul < mon2.mul) return -1
		}
		else
		    return 1
	    }
	    else if (i < other.m.length) return -1
	    else return 0
	}
    }

    // low level operations

    slice(a,b) {
	if (a === 0 && (b === undefined || b === this.m.length)) return this
	return new Ordinal(this.m.slice(a,b))
    }
    join(other) {
	if (this.isZero()) return other
	if (other.isZero()) return this
	const this_last = this.lastM()
	const other_first = other.firstM()
	if (Ordinal.cmpBase(this.lastM(), other_first) <= 0) {
	    console.warn("Cannot join ordinals (not decreasing): "+this+" ++ "+other)
	    return this
	}
	return new Ordinal(this.m.concat(other.m))
    }
    dropFirst() {
	if (this.isZero()) return this
	var monoms
	if (this.firstM().mul == 1) monoms = this.m.slice(1)
	else {
	    monoms = this.m.slice()
	    monoms[0] = { ...monoms[0], "mul": monoms[0].mul-1 }
	}
	return new Ordinal(monoms)
    }
    getFirst() {
	if (this.isZero()) return this
	return Ordinal.fromMonom(this.m[0])
    }
    getLast() {
	if (this.isZero()) return this
	return Ordinal.fromMonom(this.m[this.m.length-1])
    }

    mulRaw(n) {
	if (this.isZero()) return this
	else if (n == 0) return Ordinal.zero
	else if (n == 1) return this
	else if (this.m.length > 1) {
	    console.warn("Can natively multiply only one-summand ordinals, not: "+this)
	    return this
	}
	else {
	    const m = this.m[0]
	    return new Ordinal([{ ...m, "mul": m.mul * n }])
	}
    }

    // TODO: implement using bisection?
    // splits the summands to [big, small] such that
    // all the big >= psi(card, arg)
    // all the small < psi(card, arg)
    split(bound) {
	const bm = bound.firstM()
	var i
	for (i = 0; i < this.m.length; i++) {
	    if (Ordinal.cmpBase(this.m[i], bm) < 0) break
	}
	return [this.slice(0,i), this.slice(i)]
    }

    discardLastM() {
	return new Ordinal(this.m.slice(0,-1))
    }
    replaceLastM(monom) {
	const monoms = this.m.slice(0,-1)
	monoms.push(monom)
	return new Ordinal(monoms)
    }
    replaceFirstM(monom) {
	const monoms = this.m.slice()
	if (monoms.length == 0) monoms.push(monom)
	else monoms[0] = monom
	return new Ordinal(monoms)
    }
    addLastM(monom) {
	const monoms = this.m.slice()
	monoms.push(monom)
	return new Ordinal(monoms)
    }
    discardLast() {
	const last = this.lastM()
	if (last.mul == 1) return this.discardLastM()
	else return this.replaceLastM({ ...last, "mul": last.mul-1 })
    }
    // assumes new element strictly smaller than the previous last
    replaceLast(other) {
	const last = this.lastM()
	const monoms = this.m.slice(0,-1)
	if (last.mul > 1) monoms.push({ ...last, "mul": last.mul-1 })
	monoms.push(...other.m)
	return new Ordinal(monoms)
    }
    
    // fundamental sequence & cofinality for limit ordinals
    // * for cofinality, we calculate cf_log(thix) such that
    //   cf(alpha) = Aleph_(alpha.cfLog())
    //   Note, cofinality is a regular cardinal, so in our case, cfLog is a successor / zero
    // fundamental sequence is indexed by ordinals < cf(alpha)

    calculateCfAndFS() {
	if (!this.isLimit()) {
	    console.warn("Cannot caculate fundamental sequence / cf_log for a non-successor ordinal: "+this)
	}
	const last = this.lastM()
	if (last.arg.isZero()) {
	    if (last.card.isLimit()) {
		this._cfLog = last.card.cfLog()
		this._fs = (alpha) => {
		    return this.replaceLast(Ordinal.psiRaw(
			last.card.fs(alpha),
			Ordinal.zero
		    ))
		}
	    }
	    else {
		this._cfLog = last.card
		this._fs = (alpha) => {
		    return this.replaceLast(alpha)
		}
	    }
	}
	else if (last.arg.isSucc()) {
	    this._cfLog = Ordinal.zero
	    this._fs = (alpha) => {
		return this.replaceLast(Ordinal.psiRaw(
		    last.card,
		    last.arg.pred(),
		    alpha.toInt()
		))
	    }
	}
	else if (last.arg.cfLog().cmp(last.card) <= 0) {
	    this._cfLog = last.arg.cfLog()
	    this._fs = (alpha) => {
		return this.replaceLast(Ordinal.psiRaw(
		    last.card,
		    last.arg.fs(alpha)
		))
	    }
	}
	else {
	    const card2 = last.arg.cfLog().pred()
	    this._cfLog = Ordinal.zero
	    this._fs = (alpha) => {
		var x = Ordinal.zero
		var n = alpha.toInt()
		while (n > 0) {
		    x = last.arg.fs(
			Ordinal.psiRaw(card2, x)
		    )
		    n -= 1
		}
		return this.replaceLast(Ordinal.psiRaw(last.card, x))
	    }
	}
    }

    cfLog() {
	if (!("_cfLog" in this)) this.calculateCfAndFS()
	return this._cfLog
    }
    fs(alpha) {
	if (!("_fs" in this)) this.calculateCfAndFS()
	return this._fs(alpha)
    }

    // shorthand for fundamental sequence for ordinals with cofinality aleph_0
    // indexed by integers instead of ordinals
    seq(n) {
	return this.fs(Ordinal.fromInt(n))
    }

    // Basic Operations

    static aleph(card) {
	if (card.isZero()) return Ordinal.omega
	else return Ordinal.psiRaw(card, Ordinal.zero)
    }
    // returns the index for aleph
    card() {
	return this.firstM().card
    }
    static omega1 = Ordinal.aleph(Ordinal.one)

    pred() {
	if (!this.isSucc()) {
	    console.warn("Not a successor ordinal, cannot take a predecessor: "+this)
	    return this
	}
	return this.discardLast()
    }

    max(other) {
	if (this.cmp(other) > 0) return this
	else return other
    }

    succ() {
	if (this.isSucc()) {
	    const last = this.lastM()
	    return this.replaceLastM({ ...last, "mul": last.mul+1 })
	}
	else {
	    return this.addLastM({
		"card": Ordinal.zero,
		"arg": Ordinal.zero,
		"mul": 1
	    })
	}
    }

    add(other) {
	if (other.isZero()) return this
	if (this.isZero()) return other
	var lastCmp
	var i = this.m.length-1
	while (i >= 0) {
	    lastCmp = Ordinal.cmpBase(this.m[i], other.m[0])
	    if (lastCmp >= 0) break
	    i -= 1
	}
	if (lastCmp < 0) return other
	else if (lastCmp > 0) i += 1
	const monoms = this.m.slice(0,i)
	monoms.push(...other.m)
	if (lastCmp == 0) {
	    monoms[i] = { ...other.m[0], "mul": this.m[i].mul + other.m[0].mul }
	}
	return new Ordinal(monoms)
    }

    // ordinal res such that other + res = this
    subLeft(other) {
	var i
	for (i=0; i < this.m.length; i++) {
	    if (i >= other.m.length) return this.slice(i)

	    const cmp = Ordinal.cmpBase(this.m[i], other.m[i])
	    if (cmp < 0) return Ordinal.zero // negative difference
	    else if (cmp > 0) return this.slice(i)
	    else {
		const mul1 = this.m[i].mul
		const mul2 = other.m[i].mul
		if (mul1 < mul2) return Ordinal.zero // negative difference
		else if (mul1 > mul2) {
		    const monoms = this.m.slice(i)
		    monoms[0] = { ...monoms[0], "mul": mul1 - mul2 }
		    return new Ordinal(monoms)
		}
	    }
	}
	return Ordinal.zero
    }

    // Normal form checks
    // all ordinals here should be in their normal form, therwise the
    // functions do not work.
    // If not, we need to catch what got broken.

    // In a normal form, sometimes, usable arguments are restricted
    // a psi(card, arg) is valid only if card < cardBound (which stops the check) or arg < argBound
    validArgs(cardBound, argBound) {
	for (var m of this.m) {
	    const cardCmp = m.card.cmp(cardBound)
	    if (cardCmp < 0) continue
	    if (m.arg.cmp(argBound) > 0) return false
	    if (!m.card.validArgs(cardBound, argBound)) return false
	    if (cardCmp != 0 && !m.arg.validArgs(cardBound, argBound)) return false
	}
	return true
    }
    isNormalForm() {
	for (var m of this.m) {
	    // check positive mul
	    if (m.mul <= 0) { console.log('A'); return false }
	    // recursively check normal form
	    if (!m.card.isNormalForm()) { console.log('B'); return false }
	    if (!m.arg.isNormalForm()) { console.log('C'); return false }
	    // check that only valid arguments are used
	    if (!m.arg.validArgs(m.card, m.arg)) { console.log('D'); return false }
	}
	// check strictly decreasing monomials
	for (var i = 0; i < this.m.length-1; i++) {
	    if (Ordinal.cmpBase(this.m[i], this.m[i+1]) <= 0) { console.log('E'); return false }
	}
	return true
    }
    // find the smallest ordinal not smaller than this satisfying validArgs(cardBound, argBound)
    roundUp(cardBound, argBound) {
	var i
	var replacement = null
	for (var i = 0; i < this.m.length; i++) {
	    const m = this.m[i]
	    if (m.card.cmp(cardBound)) break
	    const card = m.card.roundUp(cardBound, argBound)
	    if (card !== m.card) {
		replacement = Ordinal.psiRaw(card, Ordinal.zero)
		break
	    }
	    if (m.arg.cmp(argBound) >= 0) {
		replacement = Ordinal.psiRaw(card.succ(), Ordinal.zero)
		break
	    }
	    const arg = m.arg.roundUp(cardBound, argBound)
	    if (arg !== m.arg) {
		replacement = Ordinal.psiRaw(card, arg)
		break
	    }
	}
	if (replacement === null) return this
	return this.slice(0,i).add(replacement)
    }
    static psi(card, arg) {
	arg = arg.roundUp(card, Ordinal.psiRaw(card, arg))
	return Ordinal.psiRaw(card, arg)
    }
    static psi0(arg) {
	return Ordinal.psi(Ordinal.zero, arg)
    }
    static psi1(arg) {
	return Ordinal.psi(Ordinal.one, arg)
    }

    // arithmetics

    // finds alpha such that this = omega^alpha, otherwise null
    omegaLogCalc() {
	if (this.m.length != 1) return null
	const m = this.firstM()
	if (m.mul != 1) return null
	const [big, small] = m.arg.split(Ordinal.aleph(m.card.succ()))
	return Ordinal.psiRaw(m.card, big).add(small).subLeft(Ordinal.one)
    }
    omegaLog() {
	if (!("omegaLog" in this.cache)) this.cache.omegaLog = this.omegaLogCalc()
	return this.cache.omegaLog
    }

    // omega ^ this -- inverse to omegaLog()
    omegaPow() {
	const card = this.card()
	const [big, small] = this.firstM().arg.split(Ordinal.aleph(card.succ()))
	var arg = Ordinal.one.add(this)
	if (small.isZero()) arg = arg.dropFirst()

	const res = Ordinal.psiRaw(card, big.join(arg))
	// console.log("omegaPow: "+this+" -> "+res+", big = "+big+", small = "+small, ", arg = "+arg)
	return res
    }

    // multiplication with a natural number
    mulN(n) {
	const monom = this.firstM()
	return this.replaceFirstM({
	    ...monom,
	    "mul": n * monom.mul
	})
    }
    // ordinal multiplication a * b
    mul(b) {
	if (this.isZero() || b.isZero()) return 0
	if (this.isOne()) return b
	if (b.isOne()) return this
	if (this.m.length > 1 || this.m[0].mul > 1) {
	    if (!b.isSucc())
		return this.getFirst().mul(b)
	    else if(!this.isFinite())
		return this.getFirst().mul(b.pred()).add(this.dropFirst())
	    else {
		return b.replaceLastM({
		    "card": Ordinal.zero,
		    "arg": Ordinal.zero,
		    "mul": this.toInt() * b.lastM().mul
		})
	    }
	}
	const logA = this.omegaLog()
	return new Ordinal(b.m.map((m) => {
	    const logB = Ordinal.fromMonom(m).omegaLog()
	    const prod = (logA.add(logB)).omegaPow()
	    return { ...prod.firstM(), "mul": m.mul }
	}))
    }

    // natural power alpha ^ n, simply as iterated multiplication
    powN(n) {
	if (n == 0) return Ordinal.one
	else {
	    var res = this
	    for (var i = 1; i < n; i++) res = res.mul(this)
	    return res
	}
    }
    // ordinal exponentiation
    pow(exp) {
	if (exp.isZero()) return Ordinal.one
	else if (this.isZero()) return Ordinal.zero
	else if (this.isOne()) return Ordinal.one
	else if (this.m.length == 1) {
	    const logThis = this.omegaLog()
	    return logThis.mul(exp).omegaPow()
	}
	else if (exp.isSucc()) {
	    const [big, small] = exp.split(Ordinal.omega)
	    return this.pow(big).mul(this.powN(small.toInt()))
	}
	else if (this.isFinite())
	    return exp.divideLeft(Ordinal.omega).omegaPow()
	else
	    return this.getFirst().pow(exp)
    }

    // finds b such that a * b = this, if a is a power of omega, and it is possible
    // undefined behavior if such b does not exist
    divideLeftPow(logA) {
	return new Ordinal(this.m.map((m) => {
	    const logThis = Ordinal.fromMonom(m).omegaLog()
	    const factor = (logThis.subLeft(logA)).omegaPow()
	    return { ...factor.firstM(), "mul": m.mul }
	}))
    }
    divideLeft(a) {
	const logA = a.omegaLog()
	if (logA === null) return null
	return this.divideLeftPow(logA)
    }
    // decomposes this into the product a * b, where a is a power of omega, and b is a successor ordinal 
    factorLeft() {
	const a = this.getLast()
	return [a, this.divideLeft()]
    }
    // returns [d, rem, a * d] such that:
    //   this = a * d + rem
    // only works for d being a power of omega
    divMod(a) {
	const [big, small] = this.split(a)
	const divBig = big.divideLeft(a)
	if (divBig === null) {
	    console.warn("Cannot divide by an ordinal that is not a power of omega: "+a)
	    return null
	}
	return [divBig, small, big]
    }

    // assumes a single summand with mul = 1
    // return [base, exp, mul] such
    // * base is as big as possible
    // * exp != 1, or mul != 1
    // * this = base ^ exp * mul
    // or null if not possible
    powerDecompose() {
	if (this.m.length != 1) return null
	const m = this.m[0]
	const [big, small] = m.arg.split(Ordinal.aleph(m.card.succ()))

	if(small.isZero()) return null
	if (m.card.isZero() && big.isZero()) { // below epsilon0
	    if (small.isOne()) return null
	    return [Ordinal.omega, small, Ordinal.one]
	}

	const base = Ordinal.psiRaw(m.card, big)
	const [expMain, expRest, _] = small.divMod(base)
	// console.log("big = "+big+", small = "+small+", base = "+base+", expMain = "+expMain+", expRest = "+expRest)
	return [base, Ordinal.one.add(expMain), expRest.omegaPow()]
    }

    //  Veblen Hierarchy
    //------------------------

    // Decomposes this into phi_i(x), where phi is the collapsing veblen function
    // defined by
    //   * phi_0(alpha) = omega^alpha
    //   * phi_i(alpha) is the alpha'th fixpoint
    //        of all previous functions psi_j for j < i
    //        where j in C_card(i)
    // 
    // returns an array [i,x] with i as high as possible, or null if not possible

    veblenCollapseDecompose() {
	if (this.m.length != 1) return null
	const m = this.m[0]
	if (m.mul != 1) return null
	if (m.arg.isZero()) return null

	// index = 0 is just the omega logarithm
	if ((m.card.isZero() && m.arg.isZero()) ||
	    m.arg.lastM().card.cmp(m.card) <= 0) return [Ordinal.zero, this.omegaLog()]

	// In fact, we read index by:
	//   this = psi_i(aleph_(i+1) ^ resIndex * factor)
	// i.e. the last summand is
	//   this = psi_i( ... + aleph_(i+1) ^ resIndex * x0)
	//        = psi_i( ... + omega ^ (aleph_(i+1) * resIndex + x0))
	// after this factorization, the 'factor' can be split into 'big' and 'small' parts,
	// where small means smaller than aleph_(i+1)
	// finally, we calculate the desired arg = psi_i(big) + small

	const aleph = Ordinal.aleph(m.card.succ())
	const lastLog = m.arg.getLast().omegaLog()
	const [resIndex, _, exp] = lastLog.divMod(aleph)
	const split = exp.add(aleph).omegaPow()
	const [big, small] = m.arg.split(split)
	const divSmall = small.divideLeftPow(exp)
	/*
	console.log("---------------------------")
	console.log(""+this)
	console.log("aleph: "+aleph)
	console.log("lastLog: "+lastLog)
	console.log("resIndex: "+resIndex)
	console.log("exp: "+exp)
	console.log("split: "+split)
	console.log("big, small: "+big+", "+small)
	console.log("divSmall: "+divSmall)
	*/
	const bigPsi = Ordinal.psiRaw(m.card, big)
	var resArg; //  = Ordinal.psiRaw(m.card, big).add(divSmall).subLeft(Ordinal.two)
	if (m.card.isZero() && big.isZero()) {
	    resArg = divSmall.subLeft(Ordinal.one)
	}
	else if (resIndex.card().cmp(m.card) > 0)
	    resArg = bigPsi.add(divSmall).subLeft(Ordinal.two)
	else switch (resIndex.cmp(bigPsi)) {
	    case 0: resArg = divSmall; break
	    case 1: resArg = divSmall.subLeft(Ordinal.one); break
	    case -1: resArg = bigPsi.add(divSmall).subLeft(Ordinal.two); break
	}
	// resArg = bigPsi.add(divSmall).subLeft(Ordinal.two)

	// console.log("resIndex, resArg: "+resIndex+", "+resArg)

	return [resIndex, resArg]
    }

    // tries to decompose into a call of a (generalized) veblen function
    // returns a list of
    //   {arg_index, arg}, where arg_indices come in a decreasing order
    // if the only arg_indices are (1,0), then it is the ordinary veblen functionz8
    // if not possible (either a sum, or the last index would equal this), returns null
    veblenDecomposeNew() {
	const veblenCollapse = this.veblenCollapseDecompose()
	if (veblenCollapse === null) return null
	const [indexCollapse, argPhi] = veblenCollapse
	const card1 = this.card().succ()
	const aleph = Ordinal.aleph(card1)
	// index >= Omega ^ Omega
	if (indexCollapse.cmp(Ordinal.psiRaw(card1, Ordinal.psiRaw(card1, aleph))) >= 0)
	    return null
	// we need to decompose indexCollapse as a polynomial
	// Omega^e0 * c0 + Omega^e1 * c1 + ... Omega^0 * c0
	const res = []
	var lastExp = null
	var coefMonoms = []
	function storeRes() {
	    res.push([
		Ordinal.one.add(lastExp),
		new Ordinal(coefMonoms),
	    ])
	    lastExp = exp
	    coefMonoms = []
	}
	for (const monom of indexCollapse.m) {
	    const ordMonom = Ordinal.fromMonom(monom) // mul constant = 1, to be able to take omegaLog
	    var exp, coef
	    if (ordMonom.cmp(aleph) < 0) {
		exp = Ordinal.zero
		coef = monom
	    }
	    else {
		const divMod = ordMonom.omegaLog().divMod(aleph)
		exp = divMod[0]
		coef = { ...divMod[1].omegaPow().firstM(), "mul": monom.mul }
	    }
	    if (lastExp === null) lastExp = exp
	    else if (lastExp.cmp(exp) > 0) storeRes()
	    coefMonoms.push(coef)
	}
	if (lastExp !== null) storeRes()
	if (!argPhi.isZero()) res.push([
	    Ordinal.zero,
	    argPhi,
	])
	return res
    }

    // possible return:
    // * { "type": "composite" } -- this is a sum of multiple values
    // * { "type": "veblen", "index": Ordinal, "arg": Ordinal }
    //   this = phi_index(arg), where phi_index is defined by
    //   * phi_0(alpha) = omega^alpha
    //   * phi_i(alpha) is the alpha'th fixpoint
    //        of all previous functions psi_j for j < i
    // * { "type" = "Gamma", "index": Ordinal }
    //   this = index'th ordinal such that psi_x(x) = x
    // * { "type" = "Gamma-fix", "index": Ordinal }
    //   this = index = Gamma_this

    veblenDecompose() {
	const res = this.veblenDecomposeMain()
	if (res === null) return { "type": "composite" }
	else {
	    const fixOutput = {
		"type": "Gamma-fix",
		"index": this,
	    }
	    const [indexPhi, argPhi] = res
	    const card = this.firstM().card.succ()
	    const gammaIndex = Ordinal.aleph(card)
	    const cmp = indexPhi.cmp(gammaIndex)
	    if (cmp < 0) {
		if (this.cmp(indexPhi) <= 0 || this.cmp(argPhi) <= 0) {
		    console.warn("Veblen decomposition didn't decrease: "+this+" -> "+indexPhi+", "+argPhi)
		    return fixOutput
		}
		return {
		    "type" : "veblen",
		    "index": indexPhi,
		    "arg": argPhi
		}
	    }
	    else if (cmp == 0) {
		if (this.cmp(argPhi) <= 0) {
		    console.warn("Veblen decomposition didn't decrease: "+this+" -> "+indexPhi+", "+argPhi)
		    return fixOutput
		}
		return {
		    "type": "Gamma",
		    "index": argPhi,
		}
	    }
	    else return fixOutput
	}
    }

    static veblen(index, arg) {
	if (index.isZero()) return arg.omegaPow()
	var card = index.card().max(arg.card())
	const aleph = Ordinal.aleph(card.succ())
	const [big, small] = arg.firstM().arg.split(aleph.pow(index.succ()))

	var psiArg = aleph.pow(index).mul(Ordinal.two.add(arg))
	if (small.isZero()) psiArg = psiArg.dropFirst()
	return Ordinal.psiRaw(card, big.join(psiArg))
    }
    epsilon() {
	return Ordinal.veblen(Ordinal.one, this)
    }
    static epsilon0 = Ordinal.zero.epsilon()
    static gamma0 = Ordinal.psi0(Ordinal.omega1.pow(Ordinal.omega1))

    // the basic psi function cannot use higher order psi's, only addition
    // multiplication, exponentation, and Omega, so its limit is the
    // Bachmann-Howard ordinal
    invertBasicPsi() {
	if (this.m.length != 1) return null
	const m = this.m[0]
	if (!m.card.isZero()) return null
	if (m.arg.cmp(Ordinal.aleph(Ordinal.two)) == 0)
	    return Ordinal.psiRaw(Ordinal.one, Ordinal.aleph(Ordinal.two))
	if (!m.arg.firstM().card.isOne() || !m.arg.lastM().card.isOne())
	    return null
	return m.arg.divideLeftPow(Ordinal.omega1).subLeft(Ordinal.one)
    }
    
    // Export

    static monomToString(monom) {
	var card = monom.card.toString()
	if (!monom.card.isSimple())
	    card = '('+card+')'
	var base
	if (monom.arg.isZero()) {
	    if (monom.card.isZero())
		return monom.mul.toString()
	    else
		base = "Ω_"+card
	}
	else if(monom.card.isZero() && monom.arg.isOne())
	    base = "ω"
	else if (monom.card.is_zero)
	    base = "ψ("+monom.arg+")"
	else
	    base = "ψ_"+card+"("+monom.arg+")"
	if (monom.mul > 1)
	    return base + "*" + monom.mul.toString()
	else
	    return base
    }
    toString() {
	if (this.isZero()) return "0"
	else return this.m.map(Ordinal.monomToString).join(" + ")
    }

    static monom1ToHtml(m, config) {
	if (m.card.isZero() && m.arg.isZero() && config.one) return "1"

	if (m.card.isZero() && m.arg.isOne() && config.omega) return "ω"
	if (m.card.isOne() && m.arg.isZero() && config.omega1) return "Ω"
	if (!m.card.isZero() && m.arg.isZero() && config.cardinals) return "Ω<sub>"+m.card.toHtml(config)+"</sub>"

	const ord = Ordinal.fromMonom(m)

	if (config.power) {
	    // try to express as a power of omega
	    const powerDec = ord.powerDecompose()
	    if (powerDec !== null) {
		const [base, exp, mul] = powerDec
		var res = base.toHtml(config)
		if (!exp.isOne()) res = res + "<sup>"+exp.toHtml(config)+"</sup>"
		if (!mul.isOne()) res = res + "·" + mul.toHtml(config)
		return res
	    }
	}
	else if (config.omegaPow) {
	    // try to express as a power of omega
	    const omegaLog = ord.omegaLog()
	    const cmp = omegaLog.cmp(ord)
	    if (cmp < 0) return "ω<sup>"+omegaLog.toHtml(config)+"</sup>"
	    if (cmp > 0)
		console.warn(
		    "Got omegaLog bigger than the original ordinal "+ord+", omegaLog = "+omegaLog
		)
	}

	if (config.epsilon || config.zeta || config.veblen0 || config.gamma || config.veblen1 || config.veblen2) {
	    // try to express using veblen function
	    const veblen = ord.veblenDecomposeNew()
	    if (veblen !== null) {
		if (config.epsilon || config.zeta || config.veblen0 || config.gamma || config.veblen1)
		    if (veblen.length == 0 || veblen[0][0].isFinite()) {
			var n
			if (veblen.length == 0) n = 0
			else n = veblen[0][0].toInt()+1
			if (n <= 3 || config.veblen1) {
			    const args = new Array(n)
			    args.fill(Ordinal.zero)
			    for (const [argIndex, arg] of veblen)
				args[argIndex.toInt()] = arg
			    var arg
			    var index
			    if (n <= 0) arg = Ordinal.zero
			    else arg = args[0]
			    if (n <= 1) index = Ordinal.zero
			    else index = args[1]
			    var indexI = null
			    if (index.isFinite()) indexI = index.toInt()

			    if (config.epsilon && n <= 2 && indexI === 1)
				return "ε<sub>"+arg.toHtml(config)+"</sub>"
			    else if (config.zeta && n <= 2 && indexI === 2)
				return "ζ<sub>"+arg.toHtml(config)+"</sub>"
			    else if (config.veblen0 && n <= 2)
				return "φ<sub>"+index.toHtml(config)+"</sub>("+arg.toHtml(config)+")"
			    else if (config.gamma && n == 3 && args[2].isOne() && index.isZero())
				return "Γ<sub>"+arg.toHtml(config)+"</sub>"
			    else if (config.veblen1) {
				args.reverse()
				return "φ("+args.map((x) => x.toHtml(config)).join(", ")+")"
			    }
			}
		    }
		if (config.veblen2) {
		    const veblenArgs = veblen.map((pair) => {
			const [index, arg] = pair
			return "<sub>"+index.toHtml(config)+":</sub>"+arg.toHtml(config)
		    })
		    return "φ("+veblenArgs.join(", ")+")"
		}
	    }
	    /*
	    if (veblen.type == "veblen" && veblen.index.isOne() && config.epsilon)
		return "ε<sub>"+veblen.arg.toHtml(config)+"</sub>"
	    if (veblen.type == "veblen" && veblen.index.isFinite() && veblen.index.toInt() == 2 && config.zeta)
		return "ζ<sub>"+veblen.arg.toHtml(config)+"</sub>"
	    if (veblen.type == "veblen" && config.veblen)
		return "φ<sub>"+veblen.index.toHtml(config)+"</sub>("+veblen.arg.toHtml(config)+")"
	    else if (veblen.type == "Gamma" && config.gamma)
		return "Γ<sub>"+veblen.index.toHtml(config)+"</sub>"
	    */
	}
	
	// default to the function psi -- we have nothing better
	if (m.card.isZero() && config.basicPsi) {
	    const arg = ord.invertBasicPsi()
	    if (arg !== null)
		return "ψ("+arg.toHtml(config)+")"
	}
	return "ψ<sub>"+m.card.toHtml(config)+"</sub>("+m.arg.toHtml(config)+")"
    }
    static monomToHtml(m, config) {

	if (m.card.isZero() && m.arg.isZero() && config.one)
	    return m.mul.toString()

	const base = Ordinal.monom1ToHtml(m, config)
	if (m.mul > 1)
	    return base + "·" + m.mul.toString()
	else
	    return base
    }
    toHtml(config) {
	if (this.isZero()) return "0"
	else return this.m.map((m) => { return Ordinal.monomToHtml(m, config) }).join(" + ")
    }
}
