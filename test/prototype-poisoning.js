var merge = require('../')
var test = require('tape')
var isMergeableObject = require('is-mergeable-object')

test('merging objects with own __proto__', function(t) {
	var user = {}
	var malicious = JSON.parse('{ "__proto__": { "admin": true } }')
	var mergedObject = merge(user, malicious)
	t.notOk(mergedObject.__proto__.admin, 'non-plain properties should not be merged')
	t.notOk(mergedObject.admin, 'the destination should have an unmodified prototype')
	t.end()
})

test('merging objects with plain and non-plain properties', function(t) {
	var plainSymbolKey = Symbol('plainSymbolKey')
	var parent = {
		parentKey: 'should be undefined'
	}
	
	var target = Object.create(parent)	
	target.plainKey = 'should be replaced'
	target[plainSymbolKey] = 'should also be replaced'
	
	var source = {
		parentKey: 'foo',
		plainKey: 'bar',
		newKey: 'baz',
		[plainSymbolKey]: 'qux'
	}
	
	var mergedObject = merge(target, source)
	t.equal(undefined, mergedObject.parentKey, 'inherited properties of target should be removed, not merged or ignored')
	t.equal('bar', mergedObject.plainKey, 'enumerable own properties of target should be merged')
	t.equal('baz', mergedObject.newKey, 'properties not yet on target should be merged')
	t.equal('qux', mergedObject[plainSymbolKey], 'enumerable own symbol properties of target should be merged')
	t.end()
})

// the following cases come from the thread here: https://github.com/TehShrike/deepmerge/pull/164
test('merging strings works with a custom string merge', function(t) {
	var target = { name: "Alexander" }
	var source = { name: "Hamilton" }
	function customMerge(key, options) {
		if (key === 'name') {
			return function(target, source, options) {
				return target[0] + '. ' + source.substring(0, 3)
			}
		} else {
			return merge
		}
	}

	function mergeable(target) {
		return isMergeableObject(target) || (typeof target === 'string' && target.length > 1)
	}

	t.equal('A. Ham', merge(target, source, { customMerge: customMerge, isMergeableObject: mergeable }).name)
	t.end()
})

test('merging objects with null prototype', function(t) {
	var target = Object.create(null)
	var source = Object.create(null)
	target.wheels = 4
	target.trunk = { toolbox: ['hammer'] }
	source.trunk = { toolbox: ['wrench'] }
	source.engine = 'v8'
	var expected = {
		wheels: 4,
		engine: 'v8',
		trunk: {
			toolbox: ['hammer', 'wrench' ]
		}
	}

	t.deepEqual(expected, merge(target, source))
	t.end()
})

test('merging a target that has an own __proto__ key does not poison the returned object', function(t) {
	var maliciousTarget = JSON.parse('{ "__proto__": { "admin": true }, "name": "a" }')
	var mergedObject = merge(maliciousTarget, { name: 'b' })
	t.equal(mergedObject.name, 'b', 'regular keys are still merged')
	t.notOk(mergedObject.admin, 'the returned object must not inherit properties from the malicious target')
	t.equal(Object.getPrototypeOf(mergedObject), Object.prototype, 'the returned object keeps Object.prototype')
	t.end()
})

test('merging two objects that both have an own __proto__ key does not poison the returned object', function(t) {
	var a = JSON.parse('{ "__proto__": { "admin": true } }')
	var b = JSON.parse('{ "__proto__": { "root": true } }')
	var mergedObject = merge(a, b)
	t.notOk(mergedObject.admin, 'no inherited admin')
	t.notOk(mergedObject.root, 'no inherited root')
	t.equal(Object.getPrototypeOf(mergedObject), Object.prototype, 'the returned object keeps Object.prototype')
	t.end()
})
