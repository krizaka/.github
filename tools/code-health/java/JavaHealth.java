// code-health, the Java side (krizaka/.github#384). Run by code-health.mjs with the classpath of ./pom.xml:
//   java -cp <cp> JavaHealth.java <repo-dir> <file-list> <ruleset>
// <file-list> holds the main source files, one path relative to <repo-dir> per line. Prints one JSON object on stdout:
// the PMD complexity values of every method (CyclomaticComplexity, CognitiveComplexity, NPathComplexity) and the
// javaparser counts the audit names. Read-only: it never writes in the repository.

import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.ConstructorDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.body.RecordDeclaration;
import com.github.javaparser.ast.expr.BinaryExpr;
import com.github.javaparser.ast.expr.Expression;
import com.github.javaparser.ast.expr.FieldAccessExpr;
import com.github.javaparser.ast.expr.InstanceOfExpr;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.NameExpr;
import com.github.javaparser.ast.expr.NullLiteralExpr;
import com.github.javaparser.ast.expr.StringLiteralExpr;
import com.github.javaparser.ast.expr.SwitchExpr;
import com.github.javaparser.ast.expr.ThisExpr;
import com.github.javaparser.ast.nodeTypes.NodeWithAnnotations;
import com.github.javaparser.ast.stmt.IfStmt;
import com.github.javaparser.ast.stmt.SwitchEntry;
import com.github.javaparser.ast.stmt.SwitchStmt;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import net.sourceforge.pmd.PMDConfiguration;
import net.sourceforge.pmd.PmdAnalysis;
import net.sourceforge.pmd.lang.LanguageRegistry;
import net.sourceforge.pmd.reporting.Report;
import net.sourceforge.pmd.reporting.RuleViolation;

@SuppressWarnings("unchecked")
public class JavaHealth {

  static final int EXAMPLES = 5;
  static final Set<String> CONTROLLER = Set.of("RestController", "Controller");
  static final Set<String> BEAN = Set.of("Service", "Component", "Repository", "RestController", "Controller", "Configuration");
  static final Set<String> SERVICE = Set.of("Service", "Component");
  static final Pattern PERSISTENCE_TYPE = Pattern.compile("(Repository|Dao|JdbcTemplate|NamedParameterJdbcTemplate|JdbcClient|EntityManager|DSLContext)\\b");
  static final Pattern UTILS = Pattern.compile(".*(Util|Utils|Helper|Helpers)$");
  static final Pattern MANAGER = Pattern.compile(".*Manager$");
  static final Set<String> RAW_BODY = Set.of("String", "byte[]", "JsonNode", "Object", "Resource", "InputStream");
  static final Pattern VALUE = Pattern.compile("(?:complexity|NPath complexity) of ([0-9,]+)");

  final Map<String, Integer> counts = new LinkedHashMap<>();
  final Map<String, List<String>> examples = new LinkedHashMap<>();
  final List<String> utilsNames = new ArrayList<>();
  final List<String> managerNames = new ArrayList<>();
  final Map<String, List<Integer>> metrics = new LinkedHashMap<>();
  final Map<String, List<String>> metricTop = new LinkedHashMap<>();
  String file;

  void inc(String key) { counts.merge(key, 1, Integer::sum); }

  void flag(String key, Node node) {
    inc(key);
    List<String> list = examples.computeIfAbsent(key, k -> new ArrayList<>());
    if (list.size() < EXAMPLES) list.add(file + ":" + node.getBegin().map(p -> p.line).orElse(0));
  }

  static boolean annotated(NodeWithAnnotations<?> n, Set<String> names) {
    return n.getAnnotations().stream().anyMatch(a -> names.contains(a.getName().getIdentifier()));
  }

  public static void main(String[] args) throws Exception {
    Path repo = Path.of(args[0]);
    List<String> files = Files.readAllLines(Path.of(args[1])).stream().filter(s -> !s.isBlank()).toList();
    JavaHealth h = new JavaHealth();
    ParserConfiguration cfg = new ParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);
    StaticJavaParser.setConfiguration(cfg);
    for (String f : files) {
      h.file = f;
      String src = Files.readString(repo.resolve(f));
      h.counts.merge("loc", (int) src.lines().filter(l -> !l.isBlank()).count(), Integer::sum);
      h.inc("files");
      try {
        h.visit(StaticJavaParser.parse(src));
      } catch (RuntimeException e) {
        h.inc("parseErrors");
      }
    }
    h.pmd(repo, files, Path.of(args[2]));
    System.out.println(h.json());
  }

  void visit(CompilationUnit cu) {
    cu.findAll(RecordDeclaration.class).forEach(r -> inc("records"));
    cu.findAll(ClassOrInterfaceDeclaration.class).forEach(this::type);
    cu.findAll(InstanceOfExpr.class).forEach(i -> { if (i.getPattern().isPresent()) inc("instanceofPatterns"); });
    cu.findAll(SwitchExpr.class).forEach(s -> { inc("switchExpressions"); switchLabels(s, s.getEntries(), true); });
    cu.findAll(SwitchStmt.class).forEach(s -> { inc("switchStatements"); switchLabels(s, s.getEntries(), false); });
    cu.findAll(IfStmt.class).forEach(this::ladder);
    cu.findAll(BinaryExpr.class).forEach(this::nullCheck);
    cu.findAll(MethodCallExpr.class).forEach(m -> {
      String n = m.getNameAsString();
      if (n.equals("requireNonNull")) inc("requireNonNull");
      if (n.equals("ofNullable")) inc("optionalOfNullable");
    });
    cu.findAll(MethodDeclaration.class).forEach(m -> {
      long n = m.findAll(BinaryExpr.class).stream().filter(JavaHealth::isNullCompare).count();
      if (n >= 3) flag("methodsWith3PlusNullChecks", m);
    });
    cu.findAll(Parameter.class).forEach(this::requestBody);
  }

  void type(ClassOrInterfaceDeclaration c) {
    if (c.hasModifier(Modifier.Keyword.SEALED)) inc(c.isInterface() ? "sealedInterfaces" : "sealedClasses");
    if (c.isInterface()) return;
    String name = c.getNameAsString();
    if (UTILS.matcher(name).matches()) { flag("utilsHelperClasses", c); utilsNames.add(name); }
    if (MANAGER.matcher(name).matches()) { inc("managerClasses"); managerNames.add(name); }
    if (annotated(c, CONTROLLER)) {
      inc("controllers");
      boolean touches = c.getFields().stream().anyMatch(f -> PERSISTENCE_TYPE.matcher(f.getElementType().asString()).find())
          || c.getConstructors().stream().flatMap(k -> k.getParameters().stream())
              .anyMatch(p -> PERSISTENCE_TYPE.matcher(p.getType().asString()).find())
          || c.findCompilationUnit().map(cu -> cu.getImports().stream()
              .anyMatch(i -> PERSISTENCE_TYPE.matcher(i.getNameAsString()).find())).orElse(false);
      if (touches) flag("controllersTouchingPersistence", c);
    }
    if (annotated(c, SERVICE)) {
      inc("services");
      for (FieldDeclaration f : c.getFields()) {
        if (f.isStatic()) continue;
        if (!f.isFinal()) flag("nonFinalServiceFields", f);
      }
    }
    for (FieldDeclaration f : c.getFields()) {
      if (f.getAnnotations().stream().anyMatch(a -> a.getNameAsString().equals("Autowired"))) flag("fieldInjection", f);
    }
  }

  void requestBody(Parameter p) {
    boolean body = p.getAnnotations().stream().anyMatch(a -> a.getNameAsString().equals("RequestBody"));
    if (!body) return;
    inc("requestBodies");
    String type = p.getType().asString().replaceAll("<.*", "");
    boolean raw = RAW_BODY.contains(type) || type.equals("Map") || type.equals("List");
    if (raw) { inc("requestBodiesRaw"); return; }
    boolean valid = p.getAnnotations().stream().anyMatch(a -> Set.of("Valid", "Validated").contains(a.getNameAsString()));
    if (!valid) flag("requestBodiesWithoutValid", p);
  }

  static boolean isNullCompare(BinaryExpr b) {
    return (b.getOperator() == BinaryExpr.Operator.EQUALS || b.getOperator() == BinaryExpr.Operator.NOT_EQUALS)
        && (b.getLeft() instanceof NullLiteralExpr || b.getRight() instanceof NullLiteralExpr);
  }

  /** A null check; « injected » when it tests a constructor parameter or a final field of a Spring bean, which Spring never leaves null. */
  void nullCheck(BinaryExpr b) {
    if (!isNullCompare(b)) return;
    inc("nullChecks");
    Expression subject = b.getLeft() instanceof NullLiteralExpr ? b.getRight() : b.getLeft();
    String name = subject instanceof NameExpr n ? n.getNameAsString()
        : subject instanceof FieldAccessExpr fa && fa.getScope() instanceof ThisExpr ? fa.getNameAsString() : null;
    if (name == null) return;
    var owner = b.findAncestor(ClassOrInterfaceDeclaration.class).orElse(null);
    if (owner == null || !annotated(owner, BEAN)) return;
    var ctor = b.findAncestor(ConstructorDeclaration.class);
    if (ctor.isPresent() && ctor.get().getParameters().stream().anyMatch(p -> p.getNameAsString().equals(name))) {
      flag("nullChecksOnInjected", b);
      return;
    }
    boolean finalField = owner.getFields().stream().filter(f -> f.isFinal() && !f.isStatic())
        .flatMap(f -> f.getVariables().stream())
        .anyMatch(v -> v.getNameAsString().equals(name) && v.getInitializer().map(i -> !(i instanceof NullLiteralExpr)).orElse(true));
    boolean shadowed = b.findAncestor(MethodDeclaration.class)
        .map(m -> m.getParameters().stream().anyMatch(p -> p.getNameAsString().equals(name))).orElse(false);
    if (finalField && !shadowed && ctor.isEmpty()) flag("nullChecksOnInjected", b);
  }

  /** The first `if` of an `else if` chain of three or more branches that all compare one subject to a string or a constant. */
  void ladder(IfStmt first) {
    if (first.getParentNode().filter(p -> p instanceof IfStmt parent && parent.getElseStmt().filter(e -> e == first).isPresent()).isPresent()) return;
    Set<String> subjects = new HashSet<>();
    int branches = 0;
    IfStmt cur = first;
    while (cur != null) {
      String s = discriminator(cur.getCondition());
      if (s == null) return;
      subjects.add(s);
      branches++;
      cur = cur.getElseStmt().filter(Node.class::isInstance).filter(e -> e instanceof IfStmt).map(e -> (IfStmt) e).orElse(null);
    }
    if (branches >= 3 && subjects.size() == 1) flag("discriminatorLadders", first);
  }

  /** The subject of `x.equals("lit")`, `"lit".equals(x)`, `x.equalsIgnoreCase(..)`, `x == CONSTANT`, or null. */
  static String discriminator(Expression c) {
    if (c instanceof MethodCallExpr m && (m.getNameAsString().equals("equals") || m.getNameAsString().equals("equalsIgnoreCase"))
        && m.getArguments().size() == 1 && m.getScope().isPresent()) {
      Expression scope = m.getScope().get(), arg = m.getArgument(0);
      if (arg instanceof StringLiteralExpr || constant(arg)) return scope.toString();
      if (scope instanceof StringLiteralExpr || constant(scope)) return arg.toString();
    }
    if (c instanceof BinaryExpr b && b.getOperator() == BinaryExpr.Operator.EQUALS) {
      if (constant(b.getRight())) return b.getLeft().toString();
      if (constant(b.getLeft())) return b.getRight().toString();
    }
    return null;
  }

  static boolean constant(Expression e) {
    String n = e instanceof NameExpr ne ? ne.getNameAsString() : e instanceof FieldAccessExpr fa ? fa.getNameAsString() : null;
    return n != null && n.length() > 1 && n.equals(n.toUpperCase()) && Character.isLetter(n.charAt(0));
  }

  void switchLabels(Node s, List<SwitchEntry> entries, boolean expression) {
    long strings = entries.stream().flatMap(e -> e.getLabels().stream()).filter(l -> l instanceof StringLiteralExpr).count();
    boolean patterns = entries.stream().flatMap(e -> e.getLabels().stream()).anyMatch(l -> l.isPatternExpr());
    if (patterns) inc("patternSwitches");
    if (strings >= 3) flag(expression ? "stringSwitchExpressions" : "stringSwitchStatements", s);
  }

  void pmd(Path repo, List<String> files, Path ruleset) {
    PMDConfiguration c = new PMDConfiguration();
    c.setDefaultLanguageVersion(LanguageRegistry.PMD.getLanguageById("java").getVersion("21"));
    c.addRuleSet(ruleset.toString());
    c.setIgnoreIncrementalAnalysis(true);
    c.setThreads(Math.max(1, Runtime.getRuntime().availableProcessors() / 2));
    files.forEach(f -> c.addInputPath(repo.resolve(f)));
    try (PmdAnalysis a = PmdAnalysis.create(c)) {
      Report r = a.performAnalysisAndCollectReport();
      for (RuleViolation v : r.getViolations()) {
        String d = v.getDescription();
        if (d.contains("class") && d.contains("total")) continue;
        Matcher m = VALUE.matcher(d);
        if (!m.find()) continue;
        String rule = v.getRule().getName();
        int value = (int) Math.min(Integer.MAX_VALUE, Long.parseLong(m.group(1).replace(",", "")));
        String path = v.getFileId().getOriginalPath(), root = repo.toAbsolutePath().normalize() + "/";
        String abs = Path.of(path).toAbsolutePath().normalize().toString();
        String where = (abs.startsWith(root) ? abs.substring(root.length()) : path) + ":" + v.getBeginLine();
        metrics.computeIfAbsent(rule, k -> new ArrayList<>()).add(value);
        metricTop.computeIfAbsent(rule, k -> new ArrayList<>()).add(value + "\t" + where);
      }
    } catch (Exception e) {
      inc("pmdErrors");
      System.err.println("pmd: " + e);
    }
  }

  static String q(String s) { return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""; }

  String json() {
    StringBuilder b = new StringBuilder("{\"counts\":{");
    b.append(String.join(",", counts.entrySet().stream().map(e -> q(e.getKey()) + ":" + e.getValue()).toList()));
    b.append("},\"examples\":{");
    b.append(String.join(",", examples.entrySet().stream()
        .map(e -> q(e.getKey()) + ":[" + String.join(",", e.getValue().stream().map(JavaHealth::q).toList()) + "]").toList()));
    b.append("},\"utilsNames\":[").append(String.join(",", utilsNames.stream().map(JavaHealth::q).toList()));
    b.append("],\"managerNames\":[").append(String.join(",", managerNames.stream().map(JavaHealth::q).toList()));
    b.append("],\"metrics\":{");
    b.append(String.join(",", metrics.entrySet().stream().map(e -> {
      List<String> top = metricTop.get(e.getKey()).stream()
          .sorted((x, y) -> Integer.compare(Integer.parseInt(y.split("\t")[0]), Integer.parseInt(x.split("\t")[0])))
          .limit(3).map(t -> t.split("\t")[1] + " (" + t.split("\t")[0] + ")").toList();
      return q(e.getKey()) + ":{\"values\":" + e.getValue() + ",\"top\":[" + String.join(",", top.stream().map(JavaHealth::q).toList()) + "]}";
    }).toList()));
    return b.append("}}").toString();
  }
}
