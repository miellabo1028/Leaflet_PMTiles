// =========================================================================
// GESAT FlatGeobuf インタラクティブ機能（専用パネルウィンドウ ＆ ロジック） 2026/9/22 Separate from layer-control.js
// =========================================================================
window.selectedMunicipios = []; 

(function prepareFgbModule() {
  let isSelectMode = false;
  let fgbGeojsonLayer = null;
  const allMunicipiosData = [];

  // 【カラー定義】検証用に少し目立つ色（未選択はハッキリしたオレンジ）に設定しています
  const STYLES = {
    hidden: { color: "#ff3b30", weight: 0, fillOpacity: 0, opacity: 0, interactive: true }, 
    baseModeOn: { color: "#ff6d00", weight: 2.0, fillColor: "#ff6d00", fillOpacity: 0.1, opacity: 0.8, interactive: true }, 
    selected: { color: "#00e676", weight: 3.5, fillColor: "#00e676", fillOpacity: 0.5, opacity: 1.0, interactive: true }  
  };

  // 💡【新設計】map-main.js から呼び出せるように初期化コントロール関数としてグローバル定義
  window.addGesatInteractiveControl = function(map) {
    console.log("[GESAT FGB] Creating Interactive Control Panel...");

    // 2つ目のコントロールパネルを定義
    const interactiveControl = L.control({
      position: "topright" // 👈 配置場所。レイヤ管理の下に並べたい場合は"topright"、別荘にしたい場合は"bottomright"や"topleft"など自由に調整可能です
    });

    interactiveControl.onAdd = function() {
      // 見た目の統一感を出すため、レイヤ管理と同じクラス名「gesat-control」を使用
      const container = L.DomUtil.create("div", "gesat-control gesat-interactive-panel");
      
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      L.DomEvent.on(container, 'click dblclick keydown keypress', L.DomEvent.stopPropagation);
      
      // 2026/9/22 updated: パネル自体からドロップダウンがはみ出るのを許可し、最前面に表示するスタイルを追加
      container.style.pointerEvents = "auto";
      container.style.overflow = "visible"; // 👈 これにより、候補枠がパネルの下に隠れなくなります
      container.style.position = "relative";

      // 機能ウィンドウ専用のHTML
      container.innerHTML = `
        <div class="gesat-title">Interactive Analysis</div>
        <div class="gesat-children" style="margin-left: 0; padding: 0 4px;">
          <div style="display: flex; gap: 4px; margin-bottom: 6px; width: 100%;">
            <button id="btn-select-mode" class="gesat-btn btn-inactive" style="flex: 3; font-size: 11px; padding: 4px 4px; white-space: nowrap;">Select Municipios: OFF</button>
            <button id="btn-clear-selection" class="gesat-btn" style="flex: 1; background-color: #757575; color: white; border: none; padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; text-align: center;">Clear</button>
          </div>
          
          <div class="gesat-search-container">
            <input type="text" id="txt-municipio-search" class="gesat-search-input" placeholder="Search Municipality..." autocomplete="off">
            <div id="search-results-dropdown" class="search-dropdown hidden"></div>
          </div>

          <!-- ================================================== -->
          <!-- 2026/9/22 added: Section on Satellite imagries throug STAC + TiTiler:【新規追加】衛星画像取得（STAC + TiTiler）セクション -->
          <!-- ================================================== -->
          <div style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;">
            <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px; color: #333;">Satellite Imagery Fetcher</div>
            
            <!-- Select satellite platform: 衛星（プラットフォーム）の種類選択 -->
            <div style="margin-bottom: 6px;">
              <label style="font-size: 10px; display: block; color: #666;">Satellite Platform</label>
              <select id="sel-satellite-type" style="width: 100%; font-size: 11px; padding: 2px;">
                <option value="sentinel-2">Sentinel-2 (Copernicus)</option>
                <option value="landsat">Landsat 8/9 (USGS)</option>
              </select>
            </div>

            <!-- Select image type: 画像タイプ選択（RGB / 各種インデックス） -->
            <div style="margin-bottom: 6px;">
              <label style="font-size: 10px; display: block; color: #666;">Visualization Style</label>
              <select id="sel-img-type" style="width: 100%; font-size: 11px; padding: 2px;">
                <option value="rgb">True Color (RGB)</option>
                <option value="ndvi">NDVI (Vegetation)</option>
                <option value="ndwi">NDWI (Water)</option>
                <option value="ndmi">NDMI (Moisture)</option>
                <option value="savi">SAVI (Solid-Adjusted Vegetation)</option>
                <option value="nbri">NBRI (Burn Ratio)</option>
              </select>
            </div>

            <!-- Set period: 期間設定（年または特定月範囲などの簡易指定） -->
            <div style="margin-bottom: 6px; display: flex; gap: 4px;">
              <div style="flex: 1;">
                <label style="font-size: 10px; display: block; color: #666;">Start Date</label>
                <input type="date" id="date-start" value="2026-01-01" style="width: 100%; font-size: 10px; padding: 2px;">
              </div>
              <div style="flex: 1;">
                <label style="font-size: 10px; display: block; color: #666;">End Date</label>
                <input type="date" id="date-end" value="2026-09-22" style="width: 100%; font-size: 10px; padding: 2px;">
              </div>
            </div>

            <!-- Set Cloud ratio: 雲量制限の設定 -->
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666;">
                <span>Max Cloud Cover</span>
                <span id="lbl-cloud-value">20%</span>
              </div>
              <input type="range" id="sld-cloud-limit" min="0" max="100" value="20" style="width: 100%; margin: 2px 0;">
            </div>

            <!-- Add button of get imagery: 画像取得アクションボタン -->
            <button id="btn-fetch-satellite" class="gesat-btn" style="width: 100%; background-color: #0288d1; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Fetch Satellite Image</button>
          </div>
         
        </div>
      `;

      // パネル内の要素に対してイベントを設定する処理（HTML生成の直後に行う必要があります）
      setTimeout(() => {
        setupPanelEvents(map);
      }, 10);

      return container;
    };

    interactiveControl.addTo(map);

    // バックグラウンドでのFlatGeobufデータ読み込み処理をキック
    initFgbLayer(map);
  };

  // 内部関数: パネル内のボタンや検索窓のイベント登録
  function setupPanelEvents(map) {
    const btnSelectMode = document.getElementById("btn-select-mode");
    const txtSearch = document.getElementById("txt-municipio-search");
    const dropdown = document.getElementById("search-results-dropdown");
    const btnClearSelection = document.getElementById("btn-clear-selection");

    // パラメータ用UI要素の取得
    const sldCloud = document.getElementById("sld-cloud-limit");
    const lblCloud = document.getElementById("lbl-cloud-value");
    const btnFetchSatellite = document.getElementById("btn-fetch-satellite");

    if (!btnSelectMode || !txtSearch || !dropdown || !btnClearSelection) {
      console.error("[GESAT FGB] UI Elements missing inside interactive panel!");
      return;
    }

    // ★ 雲量スライダーの数値をリアルタイムにラベルへ連動させるイベント
    if (sldCloud && lblCloud) {
      sldCloud.addEventListener("input", function() {
        lblCloud.textContent = sldCloud.value + "%";
      });
    }

    // 💡 現在マップ上に表示している衛星画像レイヤーを保持する変数（重複防止用）
    let currentSatelliteLayer = null;

    // ★ 画像取得ボタンがクリックされた時のイベント（STAC検索 + 署名 + TiTiler描画 修正版）
    if (btnFetchSatellite) {
      btnFetchSatellite.addEventListener("click", async function(e) {
        L.DomEvent.stopPropagation(e);
        
        // 1. 選択されたポリゴンがあるかチェック
        if (!window.selectedMunicipios || window.selectedMunicipios.length === 0) {
          alert("ポリゴンが選択されていません。市町村を1つ以上選択するか、検索してから実行してください。");
          return;
        }

        // 2. 画面上のパラメータを取得
        const satellite = document.getElementById("sel-satellite-type").value;
        const imgType = document.getElementById("sel-img-type").value;
        const startDate = document.getElementById("date-start").value;
        const endDate = document.getElementById("date-end").value;
        const cloudLimit = parseFloat(sldCloud.value);

        // ボタンをローディング状態にする
        btnFetchSatellite.disabled = true;
        btnFetchSatellite.textContent = "Searching STAC...";

        try {
          // 3. 【修正】選択された最初の市町村ポリゴンから正しい幾何構造（Geometry）を抽出
          const targetFeature = window.selectedMunicipios[0];
          
          // FlatGeobufのデータ構造にあわせ、要素がfeature単体かgeojsonのlayerオブジェクトか判定して安全に取得
          let geometry = null;
          if (targetFeature.geometry) {
            geometry = targetFeature.geometry;
          } else if (targetFeature.feature && targetFeature.feature.geometry) {
            geometry = targetFeature.feature.geometry;
          }

          if (!geometry) {
            throw new Error("選択された市町村ポリゴンから幾何データ（Geometry）を読み取れませんでした。");
          }

          // 💡<GET version> 【414エラー対策】複雑なポリゴンの代わりに、Leafletの機能を使って軽量なBBox（[西, 南, 東, 北]）を計算
          // 複雑な座標配列をすべてURLに入れないことで、文字数オーバーを完璧に防ぎます。
          let bbox = null;
          try {
            // geometryから一時的にLeafletのGeoJSONレイヤーを作成して四隅の座標を取得
            const tempLayer = L.geoJSON(geometry);
            const bounds = tempLayer.getBounds();
            const west = bounds.getWest();
            const south = bounds.getSouth();
            const east = bounds.getEast();
            const north = bounds.getNorth();
            bbox = [west, south, east, north]; // STAC標準の[minX, minY, maxX, maxY]フォーマット
          } catch (e) {
            console.error("BBoxの計算に失敗しました:", e);
            throw new Error("幾何データから範囲（BBox）を計算できませんでした。");
          }
          
          // <POST version >4. Microsoft Planetary Computer STAC API への検索リクエスト作成
          // const stacUrl = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
          // const collectionId = (satellite === "sentinel-2") ? "sentinel-2-l2a" : "landsat-c2-l2";

          // 💡 幾何データの構造を純粋なGeoJSONオブジェクトに整形して安全性を高める
          // const cleanGeometry = {
          //  type: geometry.type,
          //  coordinates: geometry.coordinates
          // };

          // 💡 標準的なSTAC APIで最も安定して動く intersects パラメータに構造を最適化
          // const searchBody = {
          //  "collections": [collectionId],
          //  "intersects": cleanGeometry, // 👈 整形した幾何データをセット
          //  "datetime": `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          //  "query": { "eo:cloud_cover": { "lte": cloudLimit } },
          //  "sortby": [{ "field": "properties.eo:cloud_cover", "direction": "asc" }], // 雲が少ない順
          //  "limit": 1
          // };

          // console.log("[STAC] Requesting to Planetary Computer...", searchBody);

          // 送信処理
          // const response = await fetch(stacUrl, {
          //  method: "POST",
          //  headers: { "Content-Type": "application/json" },
          //  body: JSON.stringify(searchBody)
          // });

          // 4. Microsoft Planetary Computer STAC API への検索リクエスト作成（GET方式への変更）
          const stacBaseUrl = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
          const collectionId = (satellite === "sentinel-2") ? "sentinel-2-l2a" : "landsat-c2-l2";

          // GET用のクエリパラメータをURLSearchParamsで構築
          const stacParams = new URLSearchParams({
            "collections": collectionId,
            "datetime": `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
            "limit": 1
          });

          // 💡 注意：複雑な intersects（ポリゴン構造）は、GETでは文字列としてシリアライズして渡します
          // stacParams.set("intersects", JSON.stringify(geometry));
          // 💡 【重要】intersectsの代わりに、計算したコンパクトなbbox配列をカンマ区切りの文字列でセット
          stacParams.set("bbox", bbox.join(","));

          // 💡 雲量フィルターとソート（雲が少ない順）の条件を追加
          stacParams.set("query", JSON.stringify({ "eo:cloud_cover": { "lte": cloudLimit } }));
          stacParams.set("sortby", JSON.stringify([{ "field": "properties.eo:cloud_cover", "direction": "asc" }]));

          // 最終的な検索URLの組み立て
          const finalStacUrl = `${stacBaseUrl}?${stacParams.toString()}`;
          console.log("[STAC GET Request] URL:", finalStacUrl);

          // GETメソッドで通信を実行（引数のオブジェクトを簡素化、または省略）
          const response = await fetch(finalStacUrl, {
            method: "GET",
            headers: { "Accept": "application/json" }
          });

          // Docker version
          // if (!response.ok) {
          //  throw new Error(`Planetary ComputerのSTAC APIでエラーが発生しました (HTTP ${response.status})`);
          // }

          //  Direct version
          if (!response.ok) throw new Error(`STAC API server error (HTTP ${response.status})`);
          
          const stacResult = await response.json();

          if (!stacResult.features || stacResult.features.length === 0) {
            throw new Error("指定された期間・雲量の条件に一致する衛星画像が、選択エリア内に見つかりませんでした。日付を広げるか、雲量制限を増やしてください。");
          }

          // 最も雲が少ない1件を取得
          const bestItem = stacResult.features[0];
          console.log("[STAC] Best Scene Item Found:", bestItem);

          // <Direct version & Get version ?>
          // 【確定版】CORS(405)を回避して安全にSASトークンを取得するプロセス
          // =================================================================
          // 5. old【修正】Planetary Computerのデータアクセス用SASトークン（署名）の自動取得
          // =================================================================
          btnFetchSatellite.textContent = "Acquiring Azure Storage Token...";
          // Docker version 5. 【超重要】Planetary Computerの画像URLを読み取るための「暗号署名（SASトークン）」をMicrosoftから取得する
          // 💡 これを行わないと、TiTiler側で画像を読み込む際に 403 Forbidden エラーになります。
          // const signUrl = `https://planetarycomputer.microsoft.com/api/sas/v1/sign`;
          // const signResponse = await fetch(signUrl, {
          //  method: "POST",
          //  headers: { "Content-Type": "application/json" },
          //  body: JSON.stringify(bestItem) // アイテム丸ごと渡すと、中に含まれる全画像URLにアクセスキーを付与してくれます
          // });

          // 💡 1. データの保管されているコンテナ名をコレクションIDから特定します
          // Sentinel-2は「sentinel-2-l2a」、Landsatは「landsat-c2-l2」というストレージアカウント名になります
          const storageAccount = (collectionId === "sentinel-2-l2a") ? "sentinel2euwest" : "landsatc2l2";
          const containerName = collectionId;
          
          // 💡 2. 安全なGETメソッドで、このコンテナ専用のアクセス許可トークンを1通だけ要求します
          // GETなので、ブラウザのOPTIONS（405エラー）に引っかからず瞬時に取得できます
          // const tokenApiUrl = `https://microsoft.com{storageAccount}/${containerName}`;
          const tokenApiUrl = `https://planetarycomputer.microsoft.com/api/sas/v1/token/${collectionId}`;
          
          const tokenResponse = await fetch(tokenApiUrl, { method: "GET" });
          if (!tokenResponse.ok) {
            throw new Error(`ストレージトークンの取得に失敗しました。Status: ${tokenResponse.status}`);
          }

          const tokenData = await tokenResponse.json();
          const sasToken = tokenData.token; // 👈 これがMicrosoftの鍵（トークン文字列）です

          // if (!signResponse.ok) {
          //  throw new Error("衛星画像URLの利用許可証（SASトークン）の取得に失敗しました。");
          // }
  
          // 💡 2. 署名(SASトークン)が埋め込まれた新しいアイテムデータをパース
          // const signedItem = await signResponse.json();
          // console.log("[SAS Sign] Token attached successfully:", signedItem);
          // const signedItem = signResponse.json ? await signResponse.json() : await signResponse.json();
          // console.log("[STAC] SAS Token Attached successfully.");

          // 6. ローカルの TiTiler (Docker) 用のタイルURLを組み立てる
          // const titilerBase = "http://172.30.103.200:8000/stac/tiles/{z}/{x}/{y}.png";
          // const titilerBase = "http://localhost:8000/stac/tiles/{z}/{x}/{y}.png";
          
          // 署名付きの自己参照URLを取得
          // const selfLink = signedItem.links.find(l => l.rel === "self").href;
          
          // let tileUrl = "";
          
          // if (imgType === "rgb") {
            // True Color (RGB) のアセット割り当て
          //   const assets = (satellite === "sentinel-2") ? "assets=B04&assets=B03&assets=B02" : "assets=red&assets=green&assets=blue";
          //   const rescale = (satellite === "sentinel-2") ? "rescale=0,3000" : "rescale=0,0.3";
          //   tileUrl = `${titilerBase}?url=${encodeURIComponent(selfLink)}&${assets}&${rescale}`;
          // } else {
            // NDVI などのインデックス計算
          //  const nirBand = (satellite === "sentinel-2") ? "B08" : "nir08";
          //  const redBand = (satellite === "sentinel-2") ? "B04" : "red";
          //  const expr = `(typecast(${nirBand},'float32')-typecast(${redBand},'float32'))/(typecast(${nirBand},'float32')+typecast(${redBand},'float32'))`;
          //  tileUrl = `${titilerBase}?url=${encodeURIComponent(selfLink)}&expression=${encodeURIComponent(expr)}&colormap_name=viridis&rescale=-1,1`;
          // }

          // 7. 古い衛星レイヤーを消去してマップへ追加
          // if (currentSatelliteLayer && map.hasLayer(currentSatelliteLayer)) {
          //  map.removeLayer(currentSatelliteLayer);
         //  }

          // currentSatelliteLayer = L.tileLayer(tileUrl, {
          //  pane: "sentinelPane",
          //  maxZoom: 19,
          //  attribution: "Planetary Computer | TiTiler"
          // }).addTo(map);

          // console.log("[TiTiler] Dynamic Tile Layer added to map. URL:", tileUrl);
          // alert("衛星画像の描画に成功しました！");

        // } catch (error) {
          // console.error("[STAC/TiTiler Error] Details:", error);
          // エラー内容をそのままダイアログに出すことで、どこで詰まったかを特定しやすくします
          // alert(`エラーが発生しました:\n${error.message}\n\n※ローカルのDocker(TiTiler)が起動していることも確認してください。`);
        // } finally {
        //   btnFetchSatellite.disabled = false;
        //   btnFetchSatellite.textContent = "Fetch Satellite Image";
        // }

        // 5. 【最適化】ローカルDockerをバイパスし、Microsoft公式の動的タイル配信サービスを利用
        // 💡 これにより、ローカルでのDockerの起動不調や、社内LANのローカル通信ブロックを100%回避できます
          // 💡 3. タイル配信URLのパラメータ構築（signedItemを使用して認証を通します）
          btnFetchSatellite.textContent = "Generating Tiles...";
          const microsoftTileBase = "https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x";
        //  let queryParams = "";
          
        // 1. 必須パラメータを初期設定
          let params = new URLSearchParams({
            collection: collectionId,
            item: bestItem.id
          });
          // let params = new URLSearchParams({
          //  collection: collectionId,
          //  item: signedItem.id // 署名付きのID
         // });
          
          if (imgType === "rgb") {
            // True Colorのバンド割当て
            if (satellite === "sentinel-2") {
              // Sentinel-2は複数のassetsパラメータを並べる必要があるため、個別に追加
              params.append("assets", "B04");
              params.append("assets", "B03");
              params.append("assets", "B02");
            } else {
              params.append("assets", "red");
              params.append("assets", "green");
              params.append("assets", "blue");
            }
            // カラーフォーミュラ
            params.set("color_formula", "Gamma RGB 3.5 Sat 1.2 Sigmoidal RGB 15 0.35");
    
            } else {
              // 各種インデックスの演算式（URLSearchParamsが自動で「+」を「%2B」に安全にエンコードしてくれます）
              let expr = "";
              if (satellite === "sentinel-2") {
                if (imgType === "ndvi") expr = "(B08-B04)/(B08+B04)";
                else if (imgType === "ndwi") expr = "(B03-B08)/(B03+B08)";
                else if (imgType === "ndmi") expr = "(B08-B11)/(B08+B11)";
                else if (imgType === "savi") expr = "1.5*(B08-B04)/(B08+B04+0.5)";
                else if (imgType === "nbri") expr = "(B08-B12)/(B08+B12)";
            } else { // Landsatの場合
              if (imgType === "ndvi") expr = "(nir08-red)/(nir08+red)";
              else if (imgType === "ndwi") expr = "(green-nir08)/(green+nir08)";
              else if (imgType === "ndmi") expr = "(nir08-swir16)/(nir08+swir16)";
              else if (imgType === "savi") expr = "1.5*(nir08-red)/(nir08+red+0.5)";
              else if (imgType === "nbri") expr = "(nir08-swir22)/(nir08+swir22)";
          }
    
          params.set("expression", expr);
          params.set("colormap_name", "viridis");
          params.set("rescale", "-1,1");
        }
          
        // 最終的なURL定義（tileUrlをここで正しく宣言）
        // const tileUrl = `${microsoftTileBase}?${params.toString()}`;
        // console.log("[Direct Tile Stream] Generated URL:", tileUrl);
        
        // =================================================================
        // 💡 【超重要・ここを修正】
        // 取得したSASトークンを、タイルサーバーが認識できる専用引数「tile_parameter」に格納します。
        // これにより、サーバーが裏側のAzureストレージのロックを解除し、404エラーを完全に打破します。
        // =================================================================
        //params.set("tile_parameter", sasToken);

        // 💡 4. 【超重要】組み立てたパラメータの最後に、取得したSASトークン（鍵）を合流させます
        // これによりタイルサーバー内部での500(Internal Error)を完璧に防ぎます
        // 💡 old 4. 【超重要】裏側のBlob Storage認証を通すため、アイテム全体の署名トークン(Query String)を結合
        // signedItem.links 内にあるプレ署名された認証情報をパラメータとして移植します
        //const tileUrl = `${microsoftTileBase}?${params.toString()}&${sasToken}`;
        //const tileUrl = `${microsoftTileBase}?${params.toString()}`;
        //console.log("[Direct Tile Stream] Authenticated URL:", tileUrl);
        const tileUrl = `${microsoftTileBase}?${params.toString()}&${sasToken}`;  
        console.log("[Direct Tile Stream] Final Authenticated URL (Raw Key Attached):", tileUrl);

        // 古い衛星レイヤーがすでにマップにあれば事前に削除して重複を防ぐ
        if (currentSatelliteLayer && map.hasLayer(currentSatelliteLayer)) {
          map.removeLayer(currentSatelliteLayer);
        }
          
          // 結合用の最終URLをビルド
          // const tileUrl = ${microsoftTileBase}?
          //  collection=${collectionId}&item=${bestItem.id}&${queryParams};
          
          // if (currentSatelliteLayer && map.hasLayer(currentSatelliteLayer)) {
          //  map.removeLayer(currentSatelliteLayer);
          // }

          // マップへ描画流し込み
          currentSatelliteLayer = L.tileLayer(tileUrl, {
            pane: "sentinelPane",
            maxZoom: 19,
            attribution: "© Microsoft Planetary Computer"
          }).addTo(map);
          
          // =================================================================
          // 💡 【重要・追加】マップの表示位置を、衛星画像の撮影範囲に自動移動させる
          // =================================================================
          if (bestItem.bbox) {
            // STACの標準BBox: [西(minX), 南(minY), 東(maxX), 北(maxY)]
            const b = bestItem.bbox;
            // LeafletのLatLngBoundsフォーマット: [[南, 西], [北, 東]] に変換
            const satelliteBounds = [[b[1], b[0]], [b[3], b[2]]];
          
            console.log("[Map View] Flying to satellite scene bounds:", satelliteBounds);
            map.flyToBounds(satelliteBounds, { padding:[20, 20], duration: 1.5 });
          }

          console.log("[Direct Tile Stream] Tile rendering initiated.");
          alert("Microsoftのサーバーから直接、衛星画像の描画に成功しました！");
          
          // 6. 古い衛星レイヤーを消去してマップへ追加
          // if (currentSatelliteLayer && map.hasLayer(currentSatelliteLayer)) {
          //  map.removeLayer(currentSatelliteLayer);
          // }

        } catch (error) {
          console.error("[Direct Stream Error] Details:", error);
          alert(`エラーが発生しました:\n${error.message}`);
        } finally {
          btnFetchSatellite.disabled = false;
          btnFetchSatellite.textContent = "Fetch Satellite Image";
        } 
      });
    }
    
    // 選択解除（Clear）
    btnClearSelection.addEventListener("click", function(e) {
      L.DomEvent.stopPropagation(e);
      if (window.selectedMunicipios.length === 0) return;

      window.selectedMunicipios = [];
      if (fgbGeojsonLayer) {
        fgbGeojsonLayer.eachLayer(function(layer) {
          layer.setStyle(isSelectMode ? STYLES.baseModeOn : STYLES.hidden);
        });
      }
    });

    // モード切り替え（Select）
    btnSelectMode.addEventListener("click", function() {
      isSelectMode = !isSelectMode;
      if (isSelectMode) {
        btnSelectMode.textContent = "Select Municipios: ON";
        btnSelectMode.className = "gesat-btn btn-active";
      } else {
        btnSelectMode.textContent = "Select Municipios: OFF";
        btnSelectMode.className = "gesat-btn btn-inactive";
      }

      if (fgbGeojsonLayer) {
        fgbGeojsonLayer.eachLayer(function(layer) {
          const isSelected = window.selectedMunicipios.some(function(f) {
            return f.properties.MUN_CODE === layer.feature.properties.MUN_CODE;
          });
          if (isSelected) {
            layer.setStyle(STYLES.selected);
          } else {
            layer.setStyle(isSelectMode ? STYLES.baseModeOn : STYLES.hidden);
          }
        });
      }
    });

    // 検索入力処理
    txtSearch.addEventListener("input", function() {
      const query = txtSearch.value.trim().toLowerCase();
      dropdown.innerHTML = "";

      if (!query) { dropdown.classList.add("hidden"); return; }

      const matches = allMunicipiosData.filter(function(item) {
        const mName = (item.feature.properties.MUN_NAME || "").toLowerCase();
        const dName = (item.feature.properties.DEP_NAME || "").toLowerCase();
        return mName.includes(query) || dName.includes(query);
      }).slice(0, 10);

      if (matches.length === 0) { dropdown.classList.add("hidden"); return; }

      matches.forEach(function(item) {
        const props = item.feature.properties;
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `<strong>${props.MUN_NAME}</strong> <span style="font-size:10px; color:#666;">(${props.DEP_NAME})</span>`;
        
        div.addEventListener("click", function(e) {
          L.DomEvent.stopPropagation(e);
          txtSearch.value = props.MUN_NAME;
          dropdown.classList.add("hidden");

          const bounds = item.layer.getBounds();
          map.flyToBounds(bounds, { padding:[20, 20], duration: 1.2 });

          item.layer.setStyle({ color: "#ffd400", weight: 5.0, opacity: 1.0, fillOpacity: 0.4 });
          
          setTimeout(function() {
            const isSelected = window.selectedMunicipios.some(function(f) {
              return f.properties.MUN_CODE === props.MUN_CODE;
            });
            if (isSelected) {
              item.layer.setStyle(STYLES.selected);
            } else {
              item.layer.setStyle(isSelectMode ? STYLES.baseModeOn : STYLES.hidden);
            }
          }, 2500);
        });
        dropdown.appendChild(div);
      });
      dropdown.classList.remove("hidden");
    });

    document.addEventListener("click", function(e) {
      if (e.target !== txtSearch) dropdown.classList.add("hidden");
    });
  }

  // 内部関数: 地図レイヤーの確保とFGBデータフェッチ
  function initFgbLayer(map) {
    if (!map.getPane("fgbSelectionPane")) {
      map.createPane("fgbSelectionPane");
    }
    map.getPane("fgbSelectionPane").style.zIndex = "800";
    map.getPane("fgbSelectionPane").style.pointerEvents = "auto";

    fgbGeojsonLayer = L.geoJSON(null, {
      pane: "fgbSelectionPane",
      style: function(feature) {
        const isSelected = window.selectedMunicipios.some(function(f) {
          return f.properties.MUN_CODE === feature.properties.MUN_CODE;
        });
        if (isSelected) return STYLES.selected;
        return isSelectMode ? STYLES.baseModeOn : STYLES.hidden;
      },
      onEachFeature: function(feature, layer) {
        allMunicipiosData.push({ feature: feature, layer: layer });

        layer.bindTooltip(function() {
          if (!isSelectMode) return null; 
          return `<strong>${feature.properties.MUN_NAME}</strong><br><small>${feature.properties.DEP_NAME}</small>`;
        }, { sticky: true, direction: "auto" });

        layer.on("click", function(e) {
          if (!isSelectMode) return; 
          L.DomEvent.stopPropagation(e);

          const props = feature.properties;
          const index = window.selectedMunicipios.findIndex(function(f) {
            return f.properties.MUN_CODE === props.MUN_CODE;
          });

          if (index > -1) {
            window.selectedMunicipios.splice(index, 1);
            layer.setStyle(STYLES.baseModeOn);
          } else {
            window.selectedMunicipios.push(feature);
            layer.setStyle(STYLES.selected);
          }
        });
      }
    }).addTo(map);

    // Cloudflare R2からデータを非同期フェッチ
    (async function fetchFgbData() {
      try {
        const fgbUrl = GESAT_CONFIG.data.boliviaMunicipiosFgb;
        if (!fgbUrl) return;

        const response = await fetch(fgbUrl);
        if (!response.ok) return;

        let deserializeFn = null;
        if (typeof flatgeobuf !== "undefined" && flatgeobuf.geojson) {
          deserializeFn = flatgeobuf.geojson.deserialize;
        } else if (typeof flatgeobuf !== "undefined") {
          deserializeFn = flatgeobuf.deserialize;
        }
        if (!deserializeFn) return;

        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const iterator = deserializeFn(uint8Array);
        
        for await (const feature of iterator) {
          fgbGeojsonLayer.addData(feature);
        }
        console.log("[GESAT FGB] Total polygons loaded inside new window.");
      } catch (error) {
        console.error("[GESAT FGB] Fetch error:", error);
      }
    })();
  }
})();

