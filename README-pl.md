# SpoCo

SpoCo jest przeglądarkowym interfejsem do korpusów tekstowych różnego typu. Nazwa jest skrótem od **Spo**ken **Co**rpus, ale również nawiązaniem do polskiego wyrazu "spoko", które w potocznym języku oznacza "w porządku", "łatwo" etc., co oddaje jego filozofię: interfejs powinien być łatwy w użyciu, ale jednocześnie dawać duże możliwości przeszukiwania i analizy korpusu.

## Rodzaje korpusów

W tej chwili interfejs obsługuje trzy typy korpusów:
    - jednojęzyczny
    - mówiony
    - równoległy

## SpoCo w praktyce

Korpusy wykorzystujące różne warianty SpoCo:

- [Korpus Gwary Spiskiej](https://spisz.ijp.pan.pl)
- [Korpus Diaspol (równoległy, polsko-niemiecki)](http://www.diaspol.uw.edu.pl/polniem)
- [Korpus Rusiński](https://www.russinisch.uni-freiburg.de/corpus)
- [LangGener - mówiony, polsko-niemiecki](https://langgener.ijp.pan.pl)
- [LETRINT-Q: korpus równoległy tekstów prawniczych)](https://letrint.unige.ch/LETRINT-Q/)

## Backend

Obecnie SpoCo działa wyłącznie z korpusami w formacie [CWB](https://cwb.sourceforge.io/). Do poprawnego działania potrzebuje CWB zainstalowanego w systemie.

### CWB - podstawowe pojęcia

CWB to zestaw standardów i narzędzi pozwalających na tworzenie i efektywne przeszukiwanie korpusów tekstowych. Poniżej słowniczek podstawowych pojęć:

- CQP/CQL - język zapytań używany do przeszukiwania korpusu o precyzyjnej i dającej duże możliwości składni
- atrybuty pozycyjne - anotacja na poziomie tokenów (wyrazów) taka jak lemat, tag gramatyczny etc.
- atrybuty strukturalne - anotacja na poziomie struktury, obejmuje sekwencję tokenów - np. zdania, grupy składniowe etc.
- VRT - format pliku tekstowego, w którym zdefionowana jest zawartość korpusu: tokeny, atrybuty pozycyjne i strukturalne

## Instalacja

W tym momencie instalacja SpoCo jest niezbyt *spoko*, bo wymaga niemało ręcznej konfiguracji - ale pracuję nad tym :)

### Wymagania

- CWB 3 lub nowszy
- Python 3.8 lub nowszy wraz z bibliotekami:
    - FastAPI
    - uvicorn
    - gunicorn
- serwer HTTP (Apache / Nginx etc.) - dla środowiska produkcyjnego
- Node 18.13 albo nowszy () - dla środowiska developerskiego

### Konfiguracja

Do poprawnego działania niezbędne jest odpowiednie przygotowanie pliku *config.json*, który znajduje się w katalogu *dist/settings*. Plik ma następującą strukturę:

- projectName: nazwa projektu / korpusu
- corpora: lista korpusów (w rozumieniu CWB - to może być pojedynczy korpus jednojęzyczny, lub więcej w przypadku korpusu równoległego). Dla każdego korpusu należy zdefiniwać następujące pola:
    - name: nazwa danego korpusu - ma znaczenie przy korpusach równoległych
    - id: ID korpusu CWB (zdefiniowane w pliku rejestru)
    - primary: 'true' w przypadku korpusów jednojęzycznych lub korpusu równoległego, który jest domyślnie główny
- positionalAttributes: lista atrybutów pozycyjnych korpusu
    - name: nazwa atrybutu
    - type: może mieć cztery wartości:
        - text: atrybut pojawi się na stronie wyszukiwania w formie pola tekstowego do uzupełnienia
        - select/multiselect: atrybut pojawi się na stronie wyszukiwania w formie pola wyboru (jedno/wielokrotnego). Dla tego typu konieczne jest zdefiniowanie pozycji "options"
        - checkbox: atrybut pojawi się na stonie wyszukiwania w formie checkboksu. W tym przypadku trzeba zdefiniować pozycje "valueTrue" i "valueFalse"
        - none: atrybut nie pojawi się na stronie wyszukiwania, ale jest potrzebny np. do zmiany warstwy wyświetlania
    - description: opis atrybutu, który pojawi się na stronie wyszukiwania
    - initValue: pooczątkowa (domyślna) wartość atrybutu. Powinna być niepusta tylko w szczególnych przypadkach
    - options: lista wartości, jakie może przyjmować atrybut. Pole konieczne w przypadku typu select/multiselect. Każda wartość musi mieć zdefiniowane następujące pola:
        - label: nazwa wartości, jaka wyświetla się użytkownikowi
        - value: faktyczna wartość, która trafi do zapytania (może być identyczna jak *label*)
    - valueTrue: pole konieczne w przypadku typu *checkbox* - określa wartość atrybutu, jeśli pole jest zaznaczone
    - valueFalse: j.w., określa wartość odznaczonego pola
    - layer: jeśli występuje, informuje, że ten atrybut tworzy jedną z warstw wyświetlania; wartością jest pozycja na liście warstw do wyświetlania
    - inTooltip: jeśli występuje i ma wartość *true*, będzie się wyświetlała w dymku pokazującym się po najechaniu na słowo na stronie wyników
- modifiers: lista predefiniowanych modyfikatorów zapytania pojawiających się na stronie wyszukiwania w postaci checkboksów:
    - 'beginning': pozwala na zdefiniowanie tylko początku wyrazu
    - 'ending': końcwka wyrazu
    - 'caseSensitive': rozróżnianie wielkości znaków
    - 'ignoreDiacritics': ignorowanie różnic diakrytycznych (np. ó/o, ł/l etc.)
- strucutralAttributes: lista atrybutów strukturalnych korpusu, które pojawią się w polu *metadane* na stronie wyników
    -name: nazwa atrybutu
    - description: nazwa atrybutu wyświetlająca się użytkownikowi
    - audio: jeśli występuje i ma wartoość *true*, określa atrybut, który reprezentuje segment dźwiękowy powiązany z konkretnym plikiem audio

- filters: lista grup zawierających atrybuty strukturalne, których można użyć do ograniczania wyników
    - name: nazwa grupy. Jeśli zdefiniowana jest tylko jedna grupa, nie wyświetla się, jeśli grup jest więcej, nazwy wyświetlają się w postaci zakładek
    - fields: atrybuty strukturalne należące do danej grupy
        - name: nazwa atrybutu
        - description: nazwa atrybutu wyświetlająca się użytkownikowi
        - type: text/select/multiselect - analogicznie jak dla atrybutów pozycyjnych
        - options: analogicznie jak dla atrybutów pozycyjnych
- cwb: definiuje ścieżki i ustawienia CWB
    - paths: ścieżki niezbędne do konfiguracji
        - cqp-path: ścieżka do narzędzia cqp
        - registry-path: ścieżka do katalogu, w którym znajduje się plik (pliki) rejestru korpusu (korpusów)
    - context: atrybut strukturalny który stanowi kontekst dla dopasowania
- audio: jeśli występuje, korpus jest traktowany jako mówiony
    - data-dir: ścieżka do katalogu z plikami dźwiękowymi powiązanymi z segmentami w korpusie
    - attribute: atrybut strukturalny, który reprezentuje segment w korpusie
- system
    - host: nazwa hosta/domeny
    - port: port

### Uruchomienie w trybie deweloperskim

Potrzebne będą dwa terminale, jeden do uruchomienia serwera Node odpowiedzialnego za intefejs, drugi do uruchomienia serwera uvicorn obsługującego backend (FastAPI/CWB). Oba uruchamiamy z katalogu głównego spoco:

1. Terminal 1
    - npm install (potrzebne tylko przy pierwszym uruchomieniu)
    - ng serve --port 4200
2. Terminal 2
    - uvicorn backend.get_results.backend --port 8000
3. Pole 'system' w pliku config.json powinno mieć następujące wartości: 
    - host: 'localhost'
    - port: 8000

Korpus powinien być dostępny pod adresem http://localhost:4200

### Uruchomienie w środowisku produkcyjnym

1. Do katalogu głównego serwera HTTP (np. /var/www/html)  skopiuj zawartość katalogu /dist
2. Uruchom serwer gunicorn na porcie 8000
3. Pole 'system' w pliku 'config.json' powinno być uzupełnione odpowiednio do ustawień serwera, np. host = 'korpus.domena.org/api', port = 8000
4. W pliku konfiguracyjnym serwera HTTP stwórz przekierowanie zapytań o adresie host:port (zdefiniowanych w punkcie wyżej) na adres, na którym nasłuchuje gunicorn

    

