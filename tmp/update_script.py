with open("src/components/GuruPanel.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. State
for i, l in enumerate(lines):
    if "const [ustadzGenderFilter, setUstadzGenderFilter] = useState('Semua');" in l:
        lines[i] = "  const [ustadzGenderFilter, setUstadzGenderFilter] = useState('Semua');\n  const [ustadzTugasFilter, setUstadzTugasFilter] = useState<string>('Semua');\n"
        break

# 2. useEffect
for i, l in enumerate(lines):
    if "setCurrentPageUstadz(1);" in l and "[ustadzSearch, ustadzStatusFilter, ustadzGenderFilter]" in lines[i+1]:
        lines[i+1] = "  }, [ustadzSearch, ustadzStatusFilter, ustadzGenderFilter, ustadzTugasFilter]);\n"
        break

# 3. exportToExcelUstadz & exportToPDFUstadz & table
for i, l in enumerate(lines):
    if "const matchesGender = ustadzGenderFilter === 'Semua' || u.jenisKelamin === ustadzGenderFilter;" in l:
        lines[i] = l + "      const matchesTugas = ustadzTugasFilter === 'Semua' || (u.tugasAkademik || '') === ustadzTugasFilter;\n"
    if "return matchesSearch && matchesStatus && matchesGender;" in l:
        lines[i] = lines[i].replace("return matchesSearch && matchesStatus && matchesGender;", "return matchesSearch && matchesStatus && matchesGender && matchesTugas;")

# Now rewrite lines 7340 to 7545
start_idx = None
end_idx = None
for i, l in enumerate(lines):
    if "onClick={() => setShowManageJabatanModal(true)}" in l:
        start_idx = i - 2 # button tag start
    if "{/* USTADZ DATA TABLE LIST (COMPACT, SORTABLE ALL COLUMNS, NO HEAVY BORDER) */}" in l and start_idx is not None:
        end_idx = i
        break

print(f"Replacing lines {start_idx+1} to {end_idx+1}")

replacement = """                      <button
                        type="button"
                        onClick={() => setShowManageJabatanModal(true)}
                        className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#064e3b] border border-emerald-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
                        title="Kelola daftar pilihan jabatan struktural dropdown"
                      >
                        <Briefcase className="h-4 w-4 text-[#064e3b]" />
                        <span>Jabatan Struktural</span>
                      </button>

                      {/* Multi-checklist Dropdown Trigger & Panel for Pilih Kolom */}
                      <div className="relative" ref={ustadzColDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowUstadzColsDropdown(!showUstadzColsDropdown)}
                          className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#064e3b] border border-emerald-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
                          title="Pilih kolom data ustadz yang ditampilkan di tabel dan PDF"
                        >
                          <SlidersHorizontal className="h-4 w-4 text-[#064e3b]" />
                          <span>Pilih Kolom ({selectedUstadzCols.length})</span>
                          <ChevronDown className={`h-3 w-3 text-[#064e3b] transition-transform duration-200 ${showUstadzColsDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showUstadzColsDropdown && (
                          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-emerald-100 shadow-2xl z-50 p-4 space-y-3 animate-apple-fade">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4 text-[#064e3b]" />
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Filter Kolom Ustadz</span>
                              </div>
                              <span className="text-[10px] font-bold text-[#064e3b] bg-emerald-50 px-2 py-0.5 rounded-full">
                                {selectedUstadzCols.length} Dipilih
                              </span>
                            </div>

                            {/* Search input for columns */}
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari nama kolom ustadz..."
                                value={ustadzColSearch}
                                onChange={(e) => setUstadzColSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              />
                            </div>

                            {/* Quick action buttons */}
                            <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold border-b border-slate-100 pb-2.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUstadzCols(ALL_USTADZ_TABLE_COLUMNS.map(c => c.id))}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-[#064e3b] rounded-lg text-slate-600 transition-colors cursor-pointer"
                              >
                                Pilih Semua
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedUstadzCols([])}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-slate-600 transition-colors cursor-pointer"
                              >
                                Hapus Semua
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedUstadzCols(DEFAULT_SELECTED_USTADZ_COLUMNS)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-[#064e3b] rounded-lg text-slate-600 transition-colors cursor-pointer"
                              >
                                Reset Default
                              </button>
                            </div>

                            {/* Checklist options */}
                            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {ALL_USTADZ_TABLE_COLUMNS.filter(c => 
                                c.label.toLowerCase().includes(ustadzColSearch.toLowerCase()) || 
                                c.category.toLowerCase().includes(ustadzColSearch.toLowerCase())
                              ).map(col => {
                                const isChecked = selectedUstadzCols.includes(col.id);
                                return (
                                  <label
                                    key={col.id}
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                                      isChecked ? 'bg-emerald-50/70 text-[#064e3b]' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedUstadzCols([...selectedUstadzCols, col.id]);
                                          } else {
                                            setSelectedUstadzCols(selectedUstadzCols.filter(id => id !== col.id));
                                          }
                                        }}
                                        className="rounded text-[#064e3b] focus:ring-[#064e3b] h-4 w-4 border-slate-300"
                                      />
                                      <span>{col.label}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {col.category}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {isPageWritable("master_ustadz") && (
                        <button 
                          onClick={() => {
                            setEditingUstadzObj(null);
                            setUstadzForm(INITIAL_USTADZ_FORM);
                            setShowUstadzModal(true);
                          }}
                          className="px-5 py-2.5 bg-[#064e3b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-emerald-100 flex items-center gap-2 active:scale-95 cursor-pointer"
                        >
                          <PlusCircle className="h-4 w-4" />
                          <span>Tambah Ustadz Baru</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 3. FILTER CONTROLLERS (COMPACT) */}
                  <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center shadow-xs">
                    <div>
                      <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cari Nama / NIP / NIK</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Ketik kata kunci pencarian..." 
                          value={ustadzSearch}
                          onChange={(e) => setUstadzSearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Filter Status Kepegawaian</label>
                      <select
                        value={ustadzStatusFilter}
                        onChange={(e) => setUstadzStatusFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
                      >
                        <option value="Semua">Tampilkan Semua Status</option>
                        <option value="Aktif">Status: Aktif</option>
                        <option value="Cuti">Status: Sedang Cuti</option>
                        <option value="Non-Aktif">Status: Non-Aktif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Filter Jenis Kelamin</label>
                      <select
                        value={ustadzGenderFilter}
                        onChange={(e) => setUstadzGenderFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
                      >
                        <option value="Semua">Semua Jenis Kelamin</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Filter Tugas Akademik</label>
                      <select
                        value={ustadzTugasFilter}
                        onChange={(e) => setUstadzTugasFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
                      >
                        <option value="Semua">Semua Tugas Akademik</option>
                        {Array.from(new Set([
                          'Tahfidz',
                          'Muadalah',
                          'Tahfidz Muadalah',
                          'Kepondokan',
                          ...ustadzList.map(u => u.tugasAkademik).filter(Boolean)
                        ])).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 md:pt-0">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-[#064e3b] uppercase tracking-widest">Total Ustadz</p>
                        <p className="text-lg font-black text-[#064e3b] leading-none">
                          {ustadzList.filter(u => {
                            const q = (ustadzSearch || '').toLowerCase().trim();
                            const matchesSearch = !q ||
                                                  (u.nama || '').toLowerCase().includes(q) || 
                                                  String(u.nip || '').toLowerCase().includes(q) ||
                                                  String(u.nik || '').toLowerCase().includes(q) ||
                                                  String(u.noHp || '').toLowerCase().includes(q);
                            const matchesStatus = ustadzStatusFilter === 'Semua' || u.statusUstadz === ustadzStatusFilter;
                            const matchesGender = ustadzGenderFilter === 'Semua' || u.jenisKelamin === ustadzGenderFilter;
                            const matchesTugas = ustadzTugasFilter === 'Semua' || (u.tugasAkademik || '') === ustadzTugasFilter;
                            return matchesSearch && matchesStatus && matchesGender && matchesTugas;
                          }).length} Orang
                        </p>
                      </div>
                    </div>
                  </div>\n\n"""

lines[start_idx:end_idx] = [replacement]

with open("src/components/GuruPanel.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("GuruPanel.tsx modified successfully!")
