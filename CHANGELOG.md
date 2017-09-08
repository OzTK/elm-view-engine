### 2.1.0 (2017-09-08)

##### Chores

* **dependencies:** bumped up ([1d47e323](https://github.com/OzTK/elm-template-engine/commit/1d47e323ccc69b5018c2d38d04a19281cd405cb9))

##### Documentation Changes

* Updated README for CLI usage ([bf50d5d7](https://github.com/OzTK/elm-template-engine/commit/bf50d5d70f4774e7bc21fec6cd500edccfe0e3ef))

##### New Features

* **Compilation:** Returns elm compiler error when views compilation fails ([ca0b5ca9](https://github.com/OzTK/elm-template-engine/commit/ca0b5ca9f3e3591ccd1f36de463470119f9a1c9b))

##### Other Changes

* **dependencies:** Switched to chalk for output styling ([6f1f3d56](https://github.com/OzTK/elm-template-engine/commit/6f1f3d560b11ef8ee3eb5ec892010922f5e35bf7))

##### Refactors

* **example:** Using elm-view-engine instead of relative lib (npm link to make it work) ([cd8c267d](https://github.com/OzTK/elm-template-engine/commit/cd8c267d9da3b9d113af84eb06952c5c8ee8a40a))

## 2.0.0 (2017-08-29)

##### Continuous Integration

* **travis:** Increased wait for tests execution ([672b6763](https://github.com/OzTK/elm-template-engine/commit/672b6763c71dc5524046c698df3ba7766892e546))
* Extending travis wait tests execution ([46eec49f](https://github.com/OzTK/elm-template-engine/commit/46eec49f5325552b3cc1e498a586237bf1658ab4))

##### Documentation Changes

* **readme:**
  * Updated elm pre-requisites ([645796fc](https://github.com/OzTK/elm-template-engine/commit/645796fcc9646cff0ab18d1e960f2f67e9858a61))
  * Updated readme for new API ([c164258b](https://github.com/OzTK/elm-template-engine/commit/c164258b6e62cd7560f777fb0597ad374d0254f4))
* **examples:**
  * Updated example to reflect the new API ([069a6fd9](https://github.com/OzTK/elm-template-engine/commit/069a6fd9ea13edb4d4b3486a89cdc7afb3d2e3d7))
  * Updated example with new API ([a510e25f](https://github.com/OzTK/elm-template-engine/commit/a510e25f1de48a6bd1fafb13eff503b4152a3402))

##### New Features

* **options:** Allowing to pass path to elm-make in options ([82e20a17](https://github.com/OzTK/elm-template-engine/commit/82e20a17985e37312c421351e732d3a5a953181e))

##### Refactors

* **views:**
  * consolidated views format by putting deserialization in the engine ([ec16ee6a](https://github.com/OzTK/elm-template-engine/commit/ec16ee6ad53248be1b1634cc7147a54eb7a1f8ed))
  * Changed views function format -> removed unnecessary msg constraint ([297fd79c](https://github.com/OzTK/elm-template-engine/commit/297fd79c0690b763a1f167e7b455fde60e919e80))

### 1.1.0 (2017-08-17)

##### Chores

* **release:** added publish npm command ([a9738ff1](https://github.com/OzTK/elm-template-engine/commit/a9738ff1d71f3f9a5eea66e82176cdc38df9d766))

##### Documentation Changes

* **example:** Updated example to demonstrate live-compiling of the views ([a3883893](https://github.com/OzTK/elm-template-engine/commit/a38838935c0038c59e7e342ae6f0e27f995a0510))

##### New Features

* auto-reloading worker module from js output file whenever it is changed ([6ae78324](https://github.com/OzTK/elm-template-engine/commit/6ae7832407401831712ea677cc293f5e9f73371e))
* **cli:** Added elm-view-engine CLI to compile a views directory from the command line ([6ea946e1](https://github.com/OzTK/elm-template-engine/commit/6ea946e1a48c1ad864013dcdf0b9cfd11c5ca3a5))
* **compilation:** Caching compiled views for future uses ([4c882e08](https://github.com/OzTK/elm-template-engine/commit/4c882e0812e9cc406cb5473728cefceca7e8f9e0))

##### Refactors

* **engine:** Simplified elm config loading (removed unused code) ([5d7fc72f](https://github.com/OzTK/elm-template-engine/commit/5d7fc72fcc40a05cd165f980566b29d50aa05a16))
* **cli:** Separated cli functions from the bin to make them testable ([6f577d30](https://github.com/OzTK/elm-template-engine/commit/6f577d309668a3c20ed7de423f88ea8317662300))

##### Tests

* **index:** Increased coverage of main module ([7f37d025](https://github.com/OzTK/elm-template-engine/commit/7f37d02540ecf87888ad12368f8382de7635b330))

#### 1.0.3 (2017-08-14)

##### Bug Fixes

* Handling elm source paths containing relative parent (../) ([376f7f1b](https://github.com/OzTK/elm-template-engine/commit/376f7f1bd6348f230c6c8c1d38687850484beb29))

#### 1.0.2 (2017-08-03)

Added typescript declaration files support

## 1.0.0 (2017-08-03)

Initial release